import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConversationLayout } from '@/components/conversation/ConversationLayout';

describe('ConversationLayout', () => {
  it('should render children', () => {
    render(
      <ConversationLayout>
        <div>Main Content</div>
      </ConversationLayout>
    );

    expect(screen.getByText('Main Content')).toBeInTheDocument();
  });

  it('should render header when not fullscreen', () => {
    render(
      <ConversationLayout
        header={<header>Test Header</header>}
      >
        <div>Content</div>
      </ConversationLayout>
    );

    expect(screen.getByText('Test Header')).toBeInTheDocument();
  });

  it('should not render header when fullscreen', () => {
    render(
      <ConversationLayout
        header={<header>Test Header</header>}
        isFullscreen={true}
      >
        <div>Content</div>
      </ConversationLayout>
    );

    expect(screen.queryByText('Test Header')).not.toBeInTheDocument();
  });

  it('should render sidebar when provided', () => {
    render(
      <ConversationLayout
        sidebar={<aside>Test Sidebar</aside>}
      >
        <div>Content</div>
      </ConversationLayout>
    );

    expect(screen.getByText('Test Sidebar')).toBeInTheDocument();
  });

  it('should not render sidebar when fullscreen', () => {
    render(
      <ConversationLayout
        sidebar={<aside>Test Sidebar</aside>}
        isFullscreen={true}
      >
        <div>Content</div>
      </ConversationLayout>
    );

    expect(screen.queryByText('Test Sidebar')).not.toBeInTheDocument();
  });

  it('should render modals', () => {
    render(
      <ConversationLayout
        modals={<div role="dialog">Test Modal</div>}
      >
        <div>Content</div>
      </ConversationLayout>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ConversationLayout className="custom-class">
        <div>Content</div>
      </ConversationLayout>
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should apply correct margin when sidebar is present', () => {
    const { container } = render(
      <ConversationLayout
        sidebar={<aside>Sidebar</aside>}
        sidebarWidth={500}
      >
        <div>Content</div>
      </ConversationLayout>
    );

    const mainContent = container.querySelector('.flex-1.flex.flex-col');
    expect(mainContent).toHaveStyle({ marginRight: '500px' });
  });

  it('should have no margin when no sidebar', () => {
    const { container } = render(
      <ConversationLayout>
        <div>Content</div>
      </ConversationLayout>
    );

    const mainContent = container.querySelector('.flex-1.flex.flex-col');
    expect(mainContent).toHaveStyle({ marginRight: '0px' });
  });

  it('should render all sections together', () => {
    render(
      <ConversationLayout
        header={<header>Header</header>}
        sidebar={<aside>Sidebar</aside>}
        modals={<div role="dialog">Modal</div>}
      >
        <div>Main Content</div>
      </ConversationLayout>
    );

    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Sidebar')).toBeInTheDocument();
    expect(screen.getByText('Main Content')).toBeInTheDocument();
    expect(screen.getByText('Modal')).toBeInTheDocument();
  });
});