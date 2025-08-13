import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';

export interface DraggableListProps<TItem extends { id: string }> {
  items: TItem[];
  onReorder: (orderedIds: string[]) => void;
  renderItem: (item: TItem) => React.ReactNode;
  className?: string;
}

/**
 * Accessible, dependency‑free sortable list using native HTML5 drag & drop.
 * - Optimistic UI via internal order state
 * - Calls onReorder with ordered IDs on drop
 */
export function AgendaDraggableList<TItem extends { id: string }>({
  items,
  onReorder,
  renderItem,
  className,
}: DraggableListProps<TItem>) {
  const [order, setOrder] = useState<string[]>(() => items.map(i => i.id));
  const draggingIdRef = useRef<string | null>(null);

  // Keep local order in sync if the items prop changes externally
  useEffect(() => {
    setOrder(items.map(i => i.id));
  }, [items]);

  const idToItem = useMemo(() => {
    const map = new Map<string, TItem>();
    for (const i of items) map.set(i.id, i);
    return map;
  }, [items]);

  const orderedItems = useMemo(() => order.map(id => idToItem.get(id)).filter(Boolean) as TItem[], [order, idToItem]);

  const handleDragStart = (ev: React.DragEvent<HTMLDivElement>, id: string) => {
    draggingIdRef.current = id;
    ev.dataTransfer.effectAllowed = 'move';
    try {
      ev.dataTransfer.setData('text/plain', id);
    } catch {}
  };

  const handleDragOver = (ev: React.DragEvent<HTMLDivElement>, overId: string) => {
    ev.preventDefault();
    const draggingId = draggingIdRef.current;
    if (!draggingId || draggingId === overId) return;

    setOrder(prev => {
      const next = prev.slice();
      const from = next.indexOf(draggingId);
      const to = next.indexOf(overId);
      if (from === -1 || to === -1) return prev;
      next.splice(from, 1);
      next.splice(to, 0, draggingId);
      return next;
    });
  };

  const handleDrop = (ev: React.DragEvent<HTMLDivElement>) => {
    ev.preventDefault();
    if (draggingIdRef.current) {
      draggingIdRef.current = null;
      onReorder(order);
    }
  };

  const handleDragEnd = () => {
    draggingIdRef.current = null;
  };

  return (
    <div className={className} onDrop={handleDrop}>
      {orderedItems.map((item) => (
        <div
          key={item.id}
          className="group flex items-center gap-3 px-3 py-2 rounded border border-border bg-card cursor-default select-none"
          draggable
          onDragStart={(e) => handleDragStart(e, item.id)}
          onDragOver={(e) => handleDragOver(e, item.id)}
          onDragEnd={handleDragEnd}
          aria-grabbed={draggingIdRef.current === item.id}
          role="listitem"
        >
          <div
            className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground/70 group-hover:text-foreground cursor-grab active:cursor-grabbing"
            title="Drag to reorder"
            aria-label="Drag handle"
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            {renderItem(item)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default AgendaDraggableList;


