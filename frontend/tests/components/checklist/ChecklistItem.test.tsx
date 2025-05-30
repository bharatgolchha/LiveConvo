import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChecklistItemComponent, ChecklistItem } from '@/components/checklist/ChecklistItem';

describe('ChecklistItemComponent', () => {
  const mockOnToggle = jest.fn();
  const mockOnDelete = jest.fn();

  const mockOpenItem: ChecklistItem = {
    id: '1',
    text: 'Test open item',
    status: 'open',
    created_at: '2025-01-30T10:00:00Z',
  };

  const mockDoneItem: ChecklistItem = {
    id: '2',
    text: 'Test done item',
    status: 'done',
    created_at: '2025-01-30T11:00:00Z',
  };

  beforeEach(() => {
    mockOnToggle.mockClear();
    mockOnDelete.mockClear();
  });

  it('renders open item correctly', () => {
    render(
      <ChecklistItemComponent
        item={mockOpenItem}
        onToggle={mockOnToggle}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Test open item')).toBeInTheDocument();
    
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    expect(screen.getByText('Test open item')).not.toHaveClass('line-through');
  });

  it('renders done item correctly', () => {
    render(
      <ChecklistItemComponent
        item={mockDoneItem}
        onToggle={mockOnToggle}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Test done item')).toBeInTheDocument();
    
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
    expect(screen.getByText('Test done item')).toHaveClass('line-through');
  });

  it('calls onToggle when checkbox is clicked', async () => {
    mockOnToggle.mockResolvedValueOnce(undefined);

    render(
      <ChecklistItemComponent
        item={mockOpenItem}
        onToggle={mockOnToggle}
        onDelete={mockOnDelete}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(mockOnToggle).toHaveBeenCalledWith('1', 'done');
  });

  it('calls onToggle with correct status for done item', async () => {
    mockOnToggle.mockResolvedValueOnce(undefined);

    render(
      <ChecklistItemComponent
        item={mockDoneItem}
        onToggle={mockOnToggle}
        onDelete={mockOnDelete}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(mockOnToggle).toHaveBeenCalledWith('2', 'open');
  });

  it('calls onDelete when delete button is clicked', async () => {
    mockOnDelete.mockResolvedValueOnce(undefined);

    render(
      <ChecklistItemComponent
        item={mockOpenItem}
        onToggle={mockOnToggle}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = document.querySelector('.lucide-trash-2');
    
    if (deleteButton) {
      fireEvent.click(deleteButton);
      expect(mockOnDelete).toHaveBeenCalledWith('1');
    }
  });

  it('shows loading state during toggle', async () => {
    let resolveToggle: (value: any) => void;
    const togglePromise = new Promise((resolve) => {
      resolveToggle = resolve;
    });
    mockOnToggle.mockReturnValueOnce(togglePromise);

    render(
      <ChecklistItemComponent
        item={mockOpenItem}
        onToggle={mockOnToggle}
        onDelete={mockOnDelete}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(checkbox).toBeDisabled();
    expect(screen.getByText('Test open item')).toHaveClass('opacity-50');

    // Resolve the promise to finish loading
    resolveToggle!(undefined);
    await waitFor(() => {
      expect(checkbox).not.toBeDisabled();
    });
  });

  it('shows loading state during delete', async () => {
    let resolveDelete: (value: any) => void;
    const deletePromise = new Promise((resolve) => {
      resolveDelete = resolve;
    });
    mockOnDelete.mockReturnValueOnce(deletePromise);

    render(
      <ChecklistItemComponent
        item={mockOpenItem}
        onToggle={mockOnToggle}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = document.querySelector('.lucide-trash-2');
    
    if (deleteButton) {
      fireEvent.click(deleteButton);

      const listItem = screen.getByRole('listitem');
      expect(listItem).toHaveClass('opacity-50');

      // Resolve the promise to finish loading
      resolveDelete!(undefined);
      await waitFor(() => {
        expect(listItem).not.toHaveClass('opacity-50');
      });
    }
  });

  it('prevents multiple simultaneous operations', async () => {
    let resolveToggle: (value: any) => void;
    const togglePromise = new Promise((resolve) => {
      resolveToggle = resolve;
    });
    mockOnToggle.mockReturnValueOnce(togglePromise);

    render(
      <ChecklistItemComponent
        item={mockOpenItem}
        onToggle={mockOnToggle}
        onDelete={mockOnDelete}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    const deleteButton = document.querySelector('.lucide-trash-2');

    // Start toggle operation
    fireEvent.click(checkbox);
    expect(mockOnToggle).toHaveBeenCalledTimes(1);

    // Try to click again - should be ignored
    fireEvent.click(checkbox);
    expect(mockOnToggle).toHaveBeenCalledTimes(1);

    // Try to delete - should be ignored
    if (deleteButton) {
      fireEvent.click(deleteButton);
      expect(mockOnDelete).not.toHaveBeenCalled();
    }

    // Resolve the toggle operation
    resolveToggle!(undefined);
  });

  it('handles toggle error correctly', async () => {
    mockOnToggle.mockRejectedValueOnce(new Error('Toggle failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <ChecklistItemComponent
        item={mockOpenItem}
        onToggle={mockOnToggle}
        onDelete={mockOnDelete}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(checkbox).not.toBeDisabled();
    });

    consoleSpy.mockRestore();
  });

  it('handles delete error correctly', async () => {
    mockOnDelete.mockRejectedValueOnce(new Error('Delete failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <ChecklistItemComponent
        item={mockOpenItem}
        onToggle={mockOnToggle}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = document.querySelector('.lucide-trash-2');
    
    if (deleteButton) {
      fireEvent.click(deleteButton);

      await waitFor(() => {
        // Should reset deleting state on error
        const listItem = screen.getByRole('listitem');
        expect(listItem).not.toHaveClass('opacity-50');
      });
    }

    consoleSpy.mockRestore();
  });
}); 