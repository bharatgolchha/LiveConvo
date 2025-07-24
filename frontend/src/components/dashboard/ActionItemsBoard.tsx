import React, { useEffect, useState, useMemo } from 'react';
import { useMyActionItems } from '@/hooks/useMyActionItems';
import { ActionItemCard } from '@/components/collaboration/ActionItemCard';
import type { ActionItemWithMeta } from '@/types/collaboration';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CheckCircle2, ListTodo, Clock, Target } from 'lucide-react';

export const ActionItemsBoard: React.FC = () => {
  const { items, loading, error, fetchMyActionItems } = useMyActionItems();
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [showHidden, setShowHidden] = useState(false);
  const { session } = useAuth();

  useEffect(() => {
    // @ts-ignore
    fetchMyActionItems(showHidden);
  }, [fetchMyActionItems, showHidden]);

  const filtered = items.filter((i: any) => {
    if (filter === 'all') return true;
    return i.status === filter;
  });

  // Group by meeting (session)
  const grouped = useMemo(() => {
    const map: Record<string, { session: any; tasks: ActionItemWithMeta[] }> = {};
    filtered.forEach((task: any) => {
      const key = task.session?.id || 'unknown';
      if (!map[key]) {
        map[key] = { session: task.session, tasks: [] };
      }
      map[key].tasks.push(task);
    });
    // Convert to array and sort by session date desc
    return Object.values(map).sort((a, b) => {
      const da = new Date(a.session?.created_at || 0).getTime();
      const db = new Date(b.session?.created_at || 0).getTime();
      return db - da;
    });
  }, [filtered]);

  const updateActionItem = async (id: string, updates: any) => {
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
      
      const res = await fetch(`/api/action-items/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates),
      });
      
      if (!res.ok) throw new Error('Failed to update task');
      
      // Refresh the list
      await fetchMyActionItems();
      toast.success('Task updated successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update task');
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      const headers: HeadersInit = {};
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
      const res = await fetch(`/api/action-items/${id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Failed');
      toast.success('Task deleted');
      await fetchMyActionItems();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        {(['all','pending','completed'] as const).map((s) => (
          <Button key={s} size="sm" variant={filter===s?'primary':'outline'} onClick={()=>setFilter(s)}>
            {s==='all'?'All': s==='pending'?'Pending':'Completed'}
          </Button>
        ))}
        <label className="flex items-center gap-1 ml-auto text-xs cursor-pointer">
          <input type="checkbox" checked={showHidden} onChange={e=>setShowHidden(e.target.checked)} /> Show hidden
        </label>
        <Button variant="ghost" size="sm" onClick={()=>{ /* @ts-ignore */ fetchMyActionItems(showHidden) }}>Refresh</Button>
      </div>

      {loading && <p className="text-muted-foreground">Loading tasks…</p>}
      {error && <p className="text-destructive">{error}</p>}

      {!loading && !grouped.length && (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          {filter === 'all' && (
            <>
              <ListTodo className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No action items yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Action items will appear here when you export them from meeting reports. 
                Start by joining a meeting or reviewing past conversations.
              </p>
              <Button 
                onClick={() => window.location.href = '/dashboard?tab=conversations'} 
                variant="outline"
              >
                View Meetings
              </Button>
            </>
          )}
          
          {filter === 'pending' && (
            <>
              <Clock className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No pending tasks</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                All caught up! You don't have any pending action items right now.
                {filtered.length < items.length && ' Check other views or export new tasks from meetings.'}
              </p>
              {filtered.length < items.length && (
                <Button 
                  onClick={() => setFilter('all')} 
                  variant="outline"
                >
                  View All Tasks
                </Button>
              )}
            </>
          )}
          
          {filter === 'completed' && (
            <>
              <CheckCircle2 className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No completed tasks</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Completed tasks will appear here once you mark them as done.
                {filtered.length < items.length && ' You have tasks in other views waiting to be completed.'}
              </p>
              {filtered.length < items.length && (
                <Button 
                  onClick={() => setFilter('pending')} 
                  variant="outline"
                >
                  View Pending Tasks
                </Button>
              )}
            </>
          )}
        </div>
      )}

      <div className="space-y-6">
        {grouped.map((group) => (
          <div key={group.session?.id || 'unknown'} className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="text-muted-foreground">From:</span>
              {group.session ? (
                <a href={`/report/${group.session.id}`} className="underline hover:text-primary">
                  {group.session.title || 'Untitled Meeting'}
                </a>
              ) : (
                'Untitled Meeting'
              )}
              <span className="text-muted-foreground">• {group.session ? format(new Date(group.session.created_at), 'MMM d, yyyy') : ''}</span>
            </h3>
            {group.tasks.sort((a,b)=> new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((item)=>(
              <div key={item.id} className="border border-border rounded-lg p-5 bg-card/80">
                <ActionItemCard 
                  actionItem={item} 
                  onUpdate={async (id, data) => await updateActionItem(id, data)} 
                  onDelete={async(id)=>deleteTask(id)} 
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}; 