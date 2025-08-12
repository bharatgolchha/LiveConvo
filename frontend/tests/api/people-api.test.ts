// Handlers will be imported dynamically per-test after mocks are in place

// Mock createAuthenticatedSupabaseClient used by routes
jest.mock('@/lib/supabase', () => {
  const buildListQueryMock = (items: any[], total: number) => {
    const chain: any = {
      or: jest.fn(() => chain),
      order: jest.fn(() => chain),
      range: jest.fn().mockResolvedValue({ data: items, count: total, error: null }),
    };
    return {
      select: jest.fn(() => chain),
      order: jest.fn(() => chain),
    };
  };

  const clientFactory = (fixtures: Record<string, any>) => ({
    from: jest.fn((table: string) => {
      if (table === 'people' && fixtures.peopleList) {
        return buildListQueryMock(fixtures.peopleList.items, fixtures.peopleList.total);
      }
      if (table === 'people' && fixtures.person) {
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn().mockResolvedValue({ data: fixtures.person, error: null }) })) })) };
      }
      if (table === 'person_calendar_stats') {
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ maybeSingle: jest.fn().mockResolvedValue({ data: fixtures.stats || null, error: null }) })) })) };
      }
      if (table === 'person_activity') {
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ order: jest.fn(() => ({ limit: jest.fn().mockResolvedValue({ data: fixtures.activity || [], error: null }) })) })) })) };
      }
      if (table === 'person_calendar_attendance') {
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ order: jest.fn(() => ({ limit: jest.fn().mockResolvedValue({ data: fixtures.meetings || [], error: null }) })) })) })) };
      }
      if (table === 'people' && fixtures.updateOk) {
        return { update: jest.fn(() => ({ eq: jest.fn(() => ({ error: null })) })) } as any;
      }
      return {} as any;
    }),
  });

  let fixtures: Record<string, any> = {};

  return {
    createAuthenticatedSupabaseClient: jest.fn(() => clientFactory(fixtures)),
    __setFixtures: (f: Record<string, any>) => {
      fixtures = f;
    },
  };
});

// Type-safe import of the mocked module to set fixtures
import * as SupabaseModule from '@/lib/supabase';

describe('People API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeReq = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => {
    return {
      url,
      method: init?.method || 'GET',
      headers: {
        get: (key: string) => init?.headers?.[key.toLowerCase()] || init?.headers?.[key] || null,
      },
      json: async () => (init?.body ? JSON.parse(init.body) : {}),
    } as any;
  };

  it('GET /api/people returns list with pagination', async () => {
    jest.doMock('next/server', () => ({
      NextResponse: {
        json: (body: any, init?: any) => ({ status: init?.status ?? 200, json: async () => body }),
      },
    }));
    const { GET: LIST_GET } = await import('@/app/api/people/route');
    (SupabaseModule as any).__setFixtures({
      peopleList: {
        items: [
          { id: 'p1', full_name: 'Alice', primary_email: 'alice@example.com', company: null, title: null, tags: [], created_at: new Date().toISOString() },
          { id: 'p2', full_name: 'Bob', primary_email: 'bob@example.com', company: null, title: null, tags: [], created_at: new Date().toISOString() },
        ],
        total: 2,
      },
    });

    const req = makeReq('http://localhost:3000/api/people?limit=20&offset=0', {
      headers: { authorization: 'Bearer token123' },
    });
    const res: any = await LIST_GET(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.items).toHaveLength(2);
    expect(body.pagination.total).toBe(2);
  });

  it('GET /api/people unauthorized when no token', async () => {
    jest.doMock('next/server', () => ({
      NextResponse: {
        json: (body: any, init?: any) => ({ status: init?.status ?? 200, json: async () => body }),
      },
    }));
    const { GET: LIST_GET } = await import('@/app/api/people/route');
    const req = makeReq('http://localhost:3000/api/people?limit=20&offset=0');
    const res: any = await LIST_GET(req);
    expect(res.status).toBe(401);
  });

  it('GET /api/people/[id] returns detail with stats, activity, meetings', async () => {
    jest.doMock('next/server', () => ({
      NextResponse: {
        json: (body: any, init?: any) => ({ status: init?.status ?? 200, json: async () => body }),
      },
    }));
    const { GET: DETAIL_GET } = await import('@/app/api/people/[id]/route');
    (SupabaseModule as any).__setFixtures({
      person: { id: 'p1', full_name: 'Alice', primary_email: 'alice@example.com' },
      stats: { total_events: 3, times_organizer: 1, accepted_count: 2, declined_count: 0, tentative_count: 1, needs_action_count: 0, first_seen_at: null, last_seen_at: null },
      activity: [ { session_id: 's1', event_id: null, occurred_at: new Date().toISOString(), activity_type: 'meeting', details: {} } ],
      meetings: [ { session_id: 's1', event_id: null, start_time: new Date().toISOString(), end_time: null, event_title: 'Sync', is_organizer: true, response_status: 'accepted', meeting_url: null } ],
    });

    const req = makeReq('http://localhost:3000/api/people/p1', {
      headers: { authorization: 'Bearer token123' },
    });
    const res: any = await DETAIL_GET(req, { params: Promise.resolve({ id: 'p1' }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.person.id).toBe('p1');
    expect(body.stats.total_events).toBe(3);
    expect(body.activity).toHaveLength(1);
    expect(body.meetings).toHaveLength(1);
  });

  it('PATCH /api/people/[id] updates allowed fields', async () => {
    jest.doMock('next/server', () => ({
      NextResponse: {
        json: (body: any, init?: any) => ({ status: init?.status ?? 200, json: async () => body }),
      },
    }));
    const { PATCH: DETAIL_PATCH } = await import('@/app/api/people/[id]/route');
    (SupabaseModule as any).__setFixtures({ updateOk: true });
    const req = makeReq('http://localhost:3000/api/people/p1', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', authorization: 'Bearer token123' },
      body: JSON.stringify({ full_name: 'Alice A', tags: ['vip'] }),
    });
    const res: any = await DETAIL_PATCH(req, { params: Promise.resolve({ id: 'p1' }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('PATCH /api/people/[id] unauthorized without token', async () => {
    jest.doMock('next/server', () => ({
      NextResponse: {
        json: (body: any, init?: any) => ({ status: init?.status ?? 200, json: async () => body }),
      },
    }));
    const { PATCH: DETAIL_PATCH } = await import('@/app/api/people/[id]/route');
    const req = makeReq('http://localhost:3000/api/people/p1', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ full_name: 'X' }),
    });
    const res: any = await DETAIL_PATCH(req, { params: Promise.resolve({ id: 'p1' }) });
    expect(res.status).toBe(401);
  });
});


