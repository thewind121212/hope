import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '@voc/components/ui/ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Delete Bookmark',
    description: 'Are you sure you want to delete this bookmark?',
  };

  it('renders when open', () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByText('Delete Bookmark')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this bookmark?')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ConfirmDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Delete Bookmark')).not.toBeInTheDocument();
  });

  it('calls onConfirm and closes when confirm clicked', async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(<ConfirmDialog {...defaultProps} onClose={onClose} onConfirm={onConfirm} />);

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    await userEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel clicked', async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(<ConfirmDialog {...defaultProps} onClose={onClose} onConfirm={onConfirm} />);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await userEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onClose when backdrop clicked', async () => {
    const onClose = vi.fn();

    render(<ConfirmDialog {...defaultProps} onClose={onClose} />);

    const backdrop = screen.getByLabelText('Close modal');
    await userEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses custom labels when provided', () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        confirmLabel="Yes, delete it"
        cancelLabel="No, keep it"
      />
    );

    expect(screen.getByRole('button', { name: 'Yes, delete it' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No, keep it' })).toBeInTheDocument();
  });

  it('shows danger variant styling', () => {
    const { container } = render(
      <ConfirmDialog {...defaultProps} variant="danger" />
    );

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmButton.className).toContain('danger');
  });

  it('shows warning variant styling', () => {
    render(<ConfirmDialog {...defaultProps} variant="warning" />);

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmButton).toBeInTheDocument();
  });

  it('auto-focuses confirm button on open', async () => {
    render(<ConfirmDialog {...defaultProps} />);

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });

    await waitFor(() => {
      expect(confirmButton).toHaveFocus();
    });
  });

  it('confirms on Enter key press', async () => {
    const onConfirm = vi.fn();

    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    confirmButton.focus();

    await userEvent.keyboard('{Enter}');

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
