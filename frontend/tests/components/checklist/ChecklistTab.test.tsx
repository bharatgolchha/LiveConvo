import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChecklistTab } from '@/components/checklist/ChecklistTab';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('ChecklistTab', () => {
  const mockSessionId = 'test-session-id';
  const mockAuthToken = 'test-auth-token';

  const mockItems = [
    { id: '1', text: 'Test item 1', status: 'open' as const, created_at: '2025-01-30T10:00:00Z' },
    { id: '2', text: 'Test item 2', status: 'done' as const, created_at: '2025-01-30T11:00:00Z' },
  ];

  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<ChecklistTab sessionId={mockSessionId} authToken={mockAuthToken} />);
    
    expect(screen.getByText('Loading checklist...')).toBeInTheDocument();
  });

  it('fetches and displays checklist items', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockItems),
    });

    render(<ChecklistTab sessionId={mockSessionId} authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText('Test item 1')).toBeInTheDocument();
      expect(screen.getByText('Test item 2')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/checklist?session=${mockSessionId}`,
      { headers: { 'Authorization': `Bearer ${mockAuthToken}` } }
    );
  });

  it('displays progress indicator correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockItems),
    });

    render(<ChecklistTab sessionId={mockSessionId} authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText('Checklist (1/2)')).toBeInTheDocument();
      expect(screen.getByText('1 of 2 completed')).toBeInTheDocument();
    });
  });

  it('shows empty state when no items exist', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<ChecklistTab sessionId={mockSessionId} authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText('No checklist items yet')).toBeInTheDocument();
      expect(screen.getByText('Add your first task below to get started')).toBeInTheDocument();
    });
  });

  it('handles add item functionality', async () => {
    // Initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    // Add item request
    const newItem = { id: '3', text: 'New test item', status: 'open', created_at: '2025-01-30T12:00:00Z' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(newItem),
    });

    render(<ChecklistTab sessionId={mockSessionId} authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText('No checklist items yet')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Add new item... (press \'n\' to focus)');

    fireEvent.change(input, { target: { value: 'New test item' } });
    
    // Submit via form
    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/checklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockAuthToken}`,
        },
        body: JSON.stringify({ sessionId: mockSessionId, text: 'New test item' }),
      });
    });
  });

  it('handles item toggle functionality', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockItems),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ...mockItems[0], status: 'done' }),
    });

    render(<ChecklistTab sessionId={mockSessionId} authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText('Test item 1')).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/checklist/1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockAuthToken}`,
        },
        body: JSON.stringify({ status: 'done' }),
      });
    });
  });

  it('handles clear completed functionality', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockItems),
    });

    // Mock delete requests for completed items
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(<ChecklistTab sessionId={mockSessionId} authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText('Clear Done')).toBeInTheDocument();
    });

    const clearButton = screen.getByText('Clear Done');
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/checklist/2', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${mockAuthToken}` },
      });
    });
  });

  it('displays error state correctly', async () => {
    // Mock the first call to fail
    mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

    render(<ChecklistTab sessionId={mockSessionId} authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load checklist')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles retry functionality', async () => {
    // First call fails
    mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));
    
    render(<ChecklistTab sessionId={mockSessionId} authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load checklist')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Second call succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockItems),
    });

    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Test item 1')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
}); 