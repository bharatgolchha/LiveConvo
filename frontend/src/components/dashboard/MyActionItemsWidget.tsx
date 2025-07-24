import React, { useEffect } from 'react';
import { useMyActionItems } from '@/hooks/useMyActionItems';
import { ActionItemCard } from '@/components/collaboration/ActionItemCard';
import { Button } from '@/components/ui/Button';

export const MyActionItemsWidget: React.FC = () => {
  const { items, loading, error, fetchMyActionItems } = useMyActionItems();

  useEffect(() => {
    fetchMyActionItems();
  }, [fetchMyActionItems]);

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading tasks…</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        Error loading tasks. <Button variant="link" size="sm" onClick={fetchMyActionItems}>Retry</Button>
      </div>
    );
  }

  if (!items.length) {
    return <div className="p-4 text-sm text-muted-foreground">No tasks yet. Add action items from reports to see them here.</div>;
  }

  return (
    <div className="space-y-3 p-4">
      {items.map((item) => (
        <ActionItemCard key={item.id} actionItem={item} onUpdate={async ()=>{/* TODO implement update via existing hook */}} onDelete={async ()=>{/* TODO delete not allowed here */}} />
      ))}
    </div>
  );
}; 