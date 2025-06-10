import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SetupState } from '@/components/conversation/ConversationStates/SetupState';

describe('SetupState', () => {
  const defaultProps = {
    textContext: '',
    onAddUserContext: jest.fn(),
    onSetConversationState: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render setup state UI elements', () => {
    render(<SetupState {...defaultProps} />);

    expect(screen.getByText("Let's Get Started")).toBeInTheDocument();
    expect(screen.getByText(/Configure your conversation title/)).toBeInTheDocument();
    expect(screen.getByText('Get Ready')).toBeInTheDocument();
  });

  it('should call state transition when Get Ready is clicked without context', () => {
    render(<SetupState {...defaultProps} />);

    fireEvent.click(screen.getByText('Get Ready'));

    expect(defaultProps.onSetConversationState).toHaveBeenCalledWith('ready');
    expect(defaultProps.onAddUserContext).not.toHaveBeenCalled();
  });

  it('should add context and transition state when Get Ready is clicked with context', () => {
    const props = {
      ...defaultProps,
      textContext: 'Test context',
    };

    render(<SetupState {...props} />);

    fireEvent.click(screen.getByText('Get Ready'));

    expect(props.onAddUserContext).toHaveBeenCalledWith('Test context');
    expect(props.onSetConversationState).toHaveBeenCalledWith('ready');
  });

  it('should render with proper styling classes', () => {
    const { container } = render(<SetupState {...defaultProps} />);

    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv).toHaveClass('m-auto', 'text-center', 'max-w-lg', 'p-8', 'bg-card', 'rounded-xl', 'shadow-2xl');
  });

  it('should render Settings2 icon', () => {
    render(<SetupState {...defaultProps} />);

    const iconContainer = screen.getByText("Let's Get Started").parentElement?.querySelector('.bg-app-info-light');
    expect(iconContainer).toBeInTheDocument();
  });

  it('should render button with correct styling', () => {
    render(<SetupState {...defaultProps} />);

    const button = screen.getByRole('button', { name: /Get Ready/i });
    expect(button).toHaveClass('px-8', 'bg-primary', 'hover:bg-primary/90', 'text-primary-foreground');
  });
});