import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

/**
 * POST /api/reports/[id]/action-items/export
 * Body: { tasks: Array<{ title: string; description?: string; priority?: 'low'|'medium'|'high'|'urgent'; dueDate?: string }> }
 * Logic:
 *   1. Validate user
 *   2. Insert tasks into collaborative_action_items with source_type='ai_generated'
 *   3. Insert a row into user_action_item_selections for each new task so it shows on dashboard
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  // Auth
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const authSupabase = createAuthenticatedSupabaseClient(token);
  const {
    data: { user },
  } = await authSupabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { createServerSupabaseClient } = await import('@/lib/supabase');
  const supabase = createServerSupabaseClient();

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const tasks = (body as any)?.tasks as Array<any> | undefined;
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return NextResponse.json({ error: 'tasks array required' }, { status: 400 });
  }

  console.log('🐛 Export endpoint received tasks:', JSON.stringify(tasks, null, 2));

  // Look up users for owner assignment
  const ownerNames = tasks.map(t => t.owner).filter(Boolean);
  let ownerToIdMap: Record<string, string> = {};
  if (ownerNames.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id,full_name,email')
      .or(ownerNames.map(name => `full_name.ilike.%${name}%,email.ilike.%${name}%`).join(','));
    if (users) {
      users.forEach(user => {
        ownerNames.forEach(name => {
          if ((user.full_name && user.full_name.toLowerCase().includes(name.toLowerCase())) ||
              (user.email && user.email.toLowerCase().includes(name.toLowerCase()))) {
            ownerToIdMap[name] = user.id;
          }
        });
      });
    }
  }

  // Basic validation and defaulting
  const records = tasks.map((t) => {
    const rawPriority = (t.priority || 'medium').toString().toLowerCase();
    const priorityMap: Record<string,string> = { critical: 'urgent' };
    const priority = priorityMap[rawPriority] || rawPriority;
    let due_date: string | null = null;
    let due_date_text: string | null = null;
    let assigned_to: string | null = null;
    if (t.dueDate) {
      const parsed = Date.parse(t.dueDate);
      if (!isNaN(parsed)) {
        due_date = new Date(parsed).toISOString();
      }
      if (!due_date) {
        due_date_text = String(t.dueDate);
      }
    }
    assigned_to = t.owner ? ownerToIdMap[t.owner] || null : null;
    return {
      session_id: sessionId,
      created_by: user.id,
      title: (t.title ?? '').trim(),
      description: t.description?.trim() || null,
      priority,
      due_date,
      due_date_text,
      assigned_to,
      owner_text: t.owner || null,
      source_type: 'ai_generated',
    };
  });

  if (records.some((r) => !r.title)) {
    return NextResponse.json({ error: 'All tasks must have a title' }, { status: 400 });
  }

  // Insert tasks in a single call
  const { data: inserted, error: insertError } = await supabase
    .from('collaborative_action_items')
    .insert(records)
    .select('id');

  if (insertError) {
    console.error('Error inserting tasks', insertError);
    return NextResponse.json({ error: 'Failed to create tasks' }, { status: 500 });
  }

  if (!inserted || inserted.length === 0) {
    return NextResponse.json({ error: 'No tasks created' }, { status: 500 });
  }

  // Create selection rows so the tasks appear on the dashboard
  const selectionRows = inserted.map((row) => ({
    user_id: user.id,
    action_item_id: row.id,
  }));

  const { error: selectionError } = await supabase
    .from('user_action_item_selections')
    .insert(selectionRows);
  if (selectionError && selectionError.code !== '23505') {
    console.error('Error inserting selections', selectionError);
    // Not fatal – tasks created; return success but warn
  }

  return NextResponse.json({ success: true, taskIds: inserted.map((r) => r.id) });
} 