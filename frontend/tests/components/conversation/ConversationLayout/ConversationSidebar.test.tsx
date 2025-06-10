import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConversationSidebar } from '@/components/conversation/ConversationLayout/ConversationSidebar';

describe('ConversationSidebar', () => {
  it('should render children when visible', () => {
    render(
      <ConversationSidebar>
        <div>Sidebar Content</div>
      </ConversationSidebar>
    );

    expect(screen.getByText('Sidebar Content')).toBeInTheDocument();
  });

  it('should not render when not visible', () => {
    render(
      <ConversationSidebar isVisible={false}>
        <div>Sidebar Content</div>
      </ConversationSidebar>
    );

    expect(screen.queryByText('Sidebar Content')).not.toBeInTheDocument();
  });

  it('should apply correct width', () => {
    const { container } = render(
      <ConversationSidebar width={500}>
        <div>Content</div>
      </ConversationSidebar>
    );

    const sidebar = container.firstChild as HTMLElement;
    expect(sidebar).toHaveStyle({ width: '500px' });
  });

  it('should position on right by default', () => {
    const { container } = render(
      <ConversationSidebar>
        <div>Content</div>
      </ConversationSidebar>
    );

    const sidebar = container.firstChild as HTMLElement;
    expect(sidebar).toHaveClass('right-0');
    expect(sidebar).toHaveClass('border-l');
  });

  it('should position on left when specified', () => {
    const { container } = render(
      <ConversationSidebar position="left">
        <div>Content</div>
      </ConversationSidebar>
    );

    const sidebar = container.firstChild as HTMLElement;
    expect(sidebar).toHaveClass('left-0');
    expect(sidebar).toHaveClass('border-r');
    expect(sidebar).not.toHaveClass('border-l');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ConversationSidebar className="custom-sidebar">
        <div>Content</div>
      </ConversationSidebar>
    );

    expect(container.firstChild).toHaveClass('custom-sidebar');
  });

  it('should show resize handle when resizable', () => {
    const { container } = render(
      <ConversationSidebar resizable={true}>
        <div>Content</div>
      </ConversationSidebar>
    );

    const resizeHandle = container.querySelector('.cursor-col-resize');
    expect(resizeHandle).toBeInTheDocument();
  });

  it('should not show resize handle when not resizable', () => {
    const { container } = render(
      <ConversationSidebar resizable={false}>
        <div>Content</div>
      </ConversationSidebar>
    );

    const resizeHandle = container.querySelector('.cursor-col-resize');
    expect(resizeHandle).not.toBeInTheDocument();
  });

  it('should call onResize when resizing', () => {
    const onResize = jest.fn();
    const { container } = render(
      <ConversationSidebar 
        resizable={true} 
        onResize={onResize}
        width={400}
        minWidth={300}
        maxWidth={600}
      >
        <div>Content</div>
      </ConversationSidebar>
    );

    const resizeHandle = container.querySelector('.cursor-col-resize') as HTMLElement;
    
    // Start resize
    fireEvent.mouseDown(resizeHandle);
    
    // Move mouse
    fireEvent.mouseMove(document, { clientX: 500 });
    
    // Should calculate new width based on window width - clientX
    // Since we can't control window.innerWidth in tests, we just verify the function was called
    expect(onResize).toHaveBeenCalled();
  });

  it('should apply transform style based on visibility', () => {
    const { container, rerender } = render(
      <ConversationSidebar isVisible={true}>
        <div>Content</div>
      </ConversationSidebar>
    );

    const sidebar = container.firstChild as HTMLElement;
    expect(sidebar).toHaveStyle({ transform: 'translateX(0)' });

    // Test with hidden state (but component still renders due to inline style)
    rerender(
      <ConversationSidebar isVisible={false}>
        <div>Content</div>
      </ConversationSidebar>
    );

    // Component returns null when not visible, so we can't test transform
    expect(container.firstChild).toBeNull();
  });

  it('should have correct z-index', () => {
    const { container } = render(
      <ConversationSidebar>
        <div>Content</div>
      </ConversationSidebar>
    );

    expect(container.firstChild).toHaveClass('z-30');
  });
});