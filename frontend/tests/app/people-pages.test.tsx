import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, act } from '@testing-library/react';
import PeoplePage from '@/app/dashboard/people/page';
import PersonDetailPage from '@/app/dashboard/people/[id]/page';

// Mock supabase auth session
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ session: { access_token: 'token' } }),
    },
  },
}));

describe('People pages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders list page empty state', async () => {
    jest.spyOn(global as any, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ items: [], pagination: { total: 0, limit: 20, offset: 0 } }), { status: 200 }));
    await act(async () => render(<PeoplePage />));
    expect(screen.getByText(/No people found/i)).toBeInTheDocument();
  });

  it('renders detail page error', async () => {
    jest.spyOn(global as any, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Not found' }), { status: 404 }));
    jest.mock('next/navigation', () => ({ useParams: () => ({ id: 'p1' }) }));
    await act(async () => render(<PersonDetailPage />));
    expect(screen.getByText(/Back/i)).toBeInTheDocument();
  });
});


