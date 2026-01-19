import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmptyState from '../EmptyState';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(
      <EmptyState
        title="No bookmarks yet"
        description="Get started by adding your first bookmark"
      />
    );

    expect(screen.getByText('No bookmarks yet')).toBeInTheDocument();
    expect(screen.getByText('Get started by adding your first bookmark')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    const onAction = vi.fn();

    render(
      <EmptyState
        title="No bookmarks yet"
        actionLabel="Add Bookmark"
        onAction={onAction}
      />
    );

    const button = screen.getByRole('button', { name: 'Add Bookmark' });
    expect(button).toBeInTheDocument();
  });

  it('calls onAction when button clicked', async () => {
    const onAction = vi.fn();

    render(
      <EmptyState
        title="No bookmarks yet"
        actionLabel="Add Bookmark"
        onAction={onAction}
      />
    );

    const button = screen.getByRole('button', { name: 'Add Bookmark' });
    await userEvent.click(button);

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('does not render button without actionLabel', () => {
    render(
      <EmptyState
        title="No bookmarks yet"
      />
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders custom icon when provided', () => {
    const customIcon = <span data-testid="custom-icon">⭐</span>;

    render(
      <EmptyState
        title="No bookmarks yet"
        icon={customIcon}
      />
    );

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <EmptyState
        title="No bookmarks yet"
        className="custom-class"
      />
    );

    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('custom-class');
  });
});
