import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AddItemInput } from '@/components/checklist/AddItemInput';

describe('AddItemInput', () => {
  const mockOnAdd = jest.fn();

  beforeEach(() => {
    mockOnAdd.mockClear();
  });

  it('renders input with correct placeholder', () => {
    render(<AddItemInput onAdd={mockOnAdd} />);
    
    expect(screen.getByPlaceholderText('Add new item... (press \'n\' to focus)')).toBeInTheDocument();
  });

  it('shows add button when text is entered', () => {
    render(<AddItemInput onAdd={mockOnAdd} />);
    
    const input = screen.getByPlaceholderText('Add new item... (press \'n\' to focus)');
    
    // No button initially
    expect(screen.queryByText('Add')).not.toBeInTheDocument();
    
    // Type text and button should appear
    fireEvent.change(input, { target: { value: 'New item' } });
    
    // Wait for the button to appear
    const addButton = input.closest('form')?.querySelector('button[type="submit"]');
    expect(addButton).toBeInTheDocument();
  });

  it('calls onAdd when form is submitted', async () => {
    mockOnAdd.mockResolvedValueOnce(undefined);

    render(<AddItemInput onAdd={mockOnAdd} />);
    
    const input = screen.getByPlaceholderText('Add new item... (press \'n\' to focus)');
    
    fireEvent.change(input, { target: { value: 'New test item' } });
    fireEvent.submit(input.closest('form')!);

    expect(mockOnAdd).toHaveBeenCalledWith('New test item');
  });

  it('calls onAdd when Enter key is pressed', async () => {
    mockOnAdd.mockResolvedValueOnce(undefined);

    render(<AddItemInput onAdd={mockOnAdd} />);
    
    const input = screen.getByPlaceholderText('Add new item... (press \'n\' to focus)');
    
    fireEvent.change(input, { target: { value: 'New test item' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockOnAdd).toHaveBeenCalledWith('New test item');
  });

  it('calls onAdd when add button is clicked', async () => {
    mockOnAdd.mockResolvedValueOnce(undefined);

    render(<AddItemInput onAdd={mockOnAdd} />);
    
    const input = screen.getByPlaceholderText('Add new item... (press \'n\' to focus)');
    
    fireEvent.change(input, { target: { value: 'New test item' } });
    
    const form = input.closest('form')!;
    const addButton = form.querySelector('button[type="submit"]');
    expect(addButton).toBeInTheDocument();
    
    fireEvent.click(addButton!);

    expect(mockOnAdd).toHaveBeenCalledWith('New test item');
  });

  it('clears input after successful submission', async () => {
    mockOnAdd.mockResolvedValueOnce(undefined);

    render(<AddItemInput onAdd={mockOnAdd} />);
    
    const input = screen.getByPlaceholderText('Add new item... (press \'n\' to focus)') as HTMLInputElement;
    
    fireEvent.change(input, { target: { value: 'New test item' } });
    expect(input.value).toBe('New test item');
    
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('trims whitespace from input', async () => {
    mockOnAdd.mockResolvedValueOnce(undefined);

    render(<AddItemInput onAdd={mockOnAdd} />);
    
    const input = screen.getByPlaceholderText('Add new item... (press \'n\' to focus)');
    
    fireEvent.change(input, { target: { value: '  New test item  ' } });
    fireEvent.submit(input.closest('form')!);

    expect(mockOnAdd).toHaveBeenCalledWith('New test item');
  });

  it('does not submit empty or whitespace-only text', () => {
    render(<AddItemInput onAdd={mockOnAdd} />);
    
    const input = screen.getByPlaceholderText('Add new item... (press \'n\' to focus)');
    
    // Try submitting empty text
    fireEvent.submit(input.closest('form')!);
    expect(mockOnAdd).not.toHaveBeenCalled();
    
    // Try submitting whitespace-only text
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(input.closest('form')!);
    expect(mockOnAdd).not.toHaveBeenCalled();
  });

  it('shows loading state during submission', async () => {
    let resolveAdd: (value: any) => void;
    const addPromise = new Promise((resolve) => {
      resolveAdd = resolve;
    });
    mockOnAdd.mockReturnValueOnce(addPromise);

    render(<AddItemInput onAdd={mockOnAdd} />);
    
    const input = screen.getByPlaceholderText('Add new item... (press \'n\' to focus)') as HTMLInputElement;
    
    fireEvent.change(input, { target: { value: 'New test item' } });
    
    const form = input.closest('form')!;
    fireEvent.submit(form);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Adding...')).toBeInTheDocument();
    });
    expect(input).toBeDisabled();

    // Resolve the promise
    resolveAdd!(undefined);
    
    await waitFor(() => {
      expect(screen.queryByText('Adding...')).not.toBeInTheDocument();
      expect(input).not.toBeDisabled();
    });
  });

  it('maintains focus on input after successful submission', async () => {
    mockOnAdd.mockResolvedValueOnce(undefined);

    render(<AddItemInput onAdd={mockOnAdd} />);
    
    const input = screen.getByPlaceholderText('Add new item... (press \'n\' to focus)');
    
    fireEvent.change(input, { target: { value: 'New test item' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(input).toHaveFocus();
    });
  });

  it('focuses input when "n" key is pressed globally', () => {
    render(<AddItemInput onAdd={mockOnAdd} />);
    
    const input = screen.getByPlaceholderText('Add new item... (press \'n\' to focus)');
    
    // Simulate global keydown event
    fireEvent.keyDown(document, { key: 'n' });
    
    expect(input).toHaveFocus();
  });

  it('does not focus input when "n" is pressed with modifiers', () => {
    render(<AddItemInput onAdd={mockOnAdd} />);
    
    const input = screen.getByPlaceholderText('Add new item... (press \'n\' to focus)');
    
    // Should not focus with Ctrl+n
    fireEvent.keyDown(document, { key: 'n', ctrlKey: true });
    expect(input).not.toHaveFocus();
    
    // Should not focus with Cmd+n
    fireEvent.keyDown(document, { key: 'n', metaKey: true });
    expect(input).not.toHaveFocus();
    
    // Should not focus with Alt+n
    fireEvent.keyDown(document, { key: 'n', altKey: true });
    expect(input).not.toHaveFocus();
  });

  it('does not focus input when "n" is pressed while focused on other input', () => {
    render(
      <div>
        <input data-testid="other-input" />
        <AddItemInput onAdd={mockOnAdd} />
      </div>
    );
    
    const otherInput = screen.getByTestId('other-input');
    const addInput = screen.getByPlaceholderText('Add new item... (press \'n\' to focus)');
    
    // Focus other input first
    fireEvent.focus(otherInput);
    expect(otherInput).toHaveFocus();
    
    // Press 'n' - should not focus the add input since other input is focused
    fireEvent.keyDown(document, { key: 'n' });
    
    expect(addInput).not.toHaveFocus();
    expect(otherInput).toHaveFocus();
  });

  it('is disabled when disabled prop is true', () => {
    render(<AddItemInput onAdd={mockOnAdd} disabled={true} />);
    
    const input = screen.getByPlaceholderText('Add new item... (press \'n\' to focus)');
    
    expect(input).toBeDisabled();
    
    // Try to add text and submit - should not work
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.submit(input.closest('form')!);
    
    expect(mockOnAdd).not.toHaveBeenCalled();
  });

  it('handles submission errors gracefully', async () => {
    mockOnAdd.mockRejectedValueOnce(new Error('Add failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<AddItemInput onAdd={mockOnAdd} />);
    
    const input = screen.getByPlaceholderText('Add new item... (press \'n\' to focus)') as HTMLInputElement;
    
    fireEvent.change(input, { target: { value: 'New test item' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error adding checklist item:', expect.any(Error));
    });

    // Should reset loading state
    expect(input).not.toBeDisabled();
    expect(screen.queryByText('Adding...')).not.toBeInTheDocument();
    
    // Should NOT clear input on error
    expect(input.value).toBe('New test item');

    consoleSpy.mockRestore();
  });
}); 