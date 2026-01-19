import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BulkActionsBar from '@voc/components/bookmarks/BulkActionsBar';

describe('BulkActionsBar', () => {
  const mockProps = {
    selectedCount: 3,
    visibleCount: 10,
    onSelectAll: jest.fn(),
    onClearSelection: jest.fn(),
    onDeleteSelected: jest.fn(),
  };

  it('should not render when selectedCount is 0', () => {
    const props = { ...mockProps, selectedCount: 0 };
    const { container } = render(<BulkActionsBar {...props} />);

    expect(container.firstChild).toBe(null);
  });

  it('should render when selectedCount > 0', () => {
    render(<BulkActionsBar {...mockProps} />);

    expect(screen.getByText('3 selected')).toBeInTheDocument();
  });

  it('should show correct count', () => {
    render(<BulkActionsBar {...mockProps} />);

    expect(screen.getByText('3 selected')).toBeInTheDocument();
  });

  it('should show "Select all" button when partially selected', () => {
    render(<BulkActionsBar {...mockProps} />);

    expect(screen.getByRole('button', { name: /Select all \(10\)/i })).toBeInTheDocument();
  });

  it('should not show "Select all" button when all are selected', () => {
    const props = { ...mockProps, selectedCount: 10, visibleCount: 10 };
    render(<BulkActionsBar {...props} />);

    expect(screen.queryByRole('button', { name: /Select all/i })).not.toBeInTheDocument();
  });

  it('should call onSelectAll when "Select all" button is clicked', () => {
    render(<BulkActionsBar {...mockProps} />);

    const selectAllBtn = screen.getByRole('button', { name: /Select all \(10\)/i });
    fireEvent.click(selectAllBtn);

    expect(mockProps.onSelectAll).toHaveBeenCalledTimes(1);
  });

  it('should call onClearSelection when "Clear selection" button is clicked', () => {
    render(<BulkActionsBar {...mockProps} />);

    const clearBtn = screen.getByRole('button', { name: /Clear selection/i });
    fireEvent.click(clearBtn);

    expect(mockProps.onClearSelection).toHaveBeenCalledTimes(1);
  });

  it('should call onDeleteSelected when "Delete selected" button is clicked', () => {
    render(<BulkActionsBar {...mockProps} />);

    const deleteBtn = screen.getByRole('button', { name: /Delete selected/i });
    fireEvent.click(deleteBtn);

    expect(mockProps.onDeleteSelected).toHaveBeenCalledTimes(1);
  });

  it('should have fixed positioning at bottom', () => {
    const { container } = render(<BulkActionsBar {...mockProps} />);

    const bar = container.firstChild as HTMLElement;
    expect(bar.className).toContain('fixed');
    expect(bar.className).toContain('bottom-6');
  });

  it('should render all buttons when partially selected', () => {
    render(<BulkActionsBar {...mockProps} />);

    expect(screen.getByRole('button', { name: /Select all/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clear selection/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete selected/i })).toBeInTheDocument();
  });

  it('should only show "Clear selection" and "Delete selected" when all selected', () => {
    const props = { ...mockProps, selectedCount: 10, visibleCount: 10 };
    render(<BulkActionsBar {...props} />);

    expect(screen.queryByRole('button', { name: /Select all/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clear selection/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete selected/i })).toBeInTheDocument();
  });
});
