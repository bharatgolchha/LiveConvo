import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AgendaDraggableList } from '@/components/meeting/conversation/AgendaDraggableList';

function renderList(onReorder: (ids: string[]) => void) {
  const items = [
    { id: 'a', title: 'First' },
    { id: 'b', title: 'Second' },
    { id: 'c', title: 'Third' },
  ];

  render(
    <AgendaDraggableList
      items={items}
      onReorder={onReorder}
      renderItem={(it) => <div data-testid={`row-${it.id}`}>{it.title}</div>}
      className="space-y-2"
    />
  );
}

test('renders items', () => {
  const onReorder = jest.fn();
  renderList(onReorder);
  expect(screen.getByTestId('row-a')).toHaveTextContent('First');
  expect(screen.getByTestId('row-b')).toHaveTextContent('Second');
  expect(screen.getByTestId('row-c')).toHaveTextContent('Third');
});

test('calls onReorder after drag and drop', () => {
  const onReorder = jest.fn();
  renderList(onReorder);

  const rows = [
    screen.getByTestId('row-a').closest('div')!,
    screen.getByTestId('row-b').closest('div')!,
    screen.getByTestId('row-c').closest('div')!,
  ];

  // Simulate dragging b over a, then drop
  fireEvent.dragStart(rows[1]);
  fireEvent.dragOver(rows[0]);
  fireEvent.drop(rows[0]);

  expect(onReorder).toHaveBeenCalledTimes(1);
  const newOrder = onReorder.mock.calls[0][0];
  expect(newOrder).toEqual(['b', 'a', 'c']);
});


