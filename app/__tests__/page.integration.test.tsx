import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '@/app/page';

// Mock all dependencies
vi.mock('@/hooks/useBookmarks', () => ({
  useBookmarks: () => ({
    bookmarks: [],
    allBookmarks: [],
    pendingAdds: new Set(),
    pendingDeletes: new Set(),
    isLoading: false,
    errorMessage: null,
    addBookmark: vi.fn(() => ({ success: true, bookmark: {} })),
    deleteBookmark: vi.fn(() => ({ success: true })),
    updateBookmark: vi.fn(() => ({ success: true })),
    importBookmarks: vi.fn(() => Promise.resolve({ success: true })),
    clearError: vi.fn(),
  }),
  BookmarksProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(),
}));

vi.mock('@/lib/migration', () => ({
  runOnboardingMigration: vi.fn(),
}));

vi.mock('@/components/onboarding/OnboardingPanel', () => ({
  OnboardingPanel: () => null,
}));

describe('Home Page Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the main page structure', () => {
    render(<Home />);

    expect(screen.getByText('Your personal vault')).toBeInTheDocument();
    expect(screen.getByText('Manage your bookmarks')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add bookmark' })).toBeInTheDocument();
  });

  it('opens form modal when Add bookmark is clicked', async () => {
    render(<Home />);

    const addButton = screen.getByRole('button', { name: 'Add bookmark' });
    await userEvent.click(addButton);

    // Modal should be visible
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('opens import/export modal when import button is clicked', async () => {
    render(<Home />);

    const importButton = screen.getByRole('button', { name: /import or export/i });
    await userEvent.click(importButton);

    // Modal should be visible
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('renders keyboard shortcuts help button', () => {
    render(<Home />);

    expect(screen.getByLabelText('Show keyboard shortcuts')).toBeInTheDocument();
  });

  it('toggles keyboard shortcuts help popover', async () => {
    render(<Home />);

    const helpButton = screen.getByLabelText('Show keyboard shortcuts');
    await userEvent.click(helpButton);

    await waitFor(() => {
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
      expect(screen.getByText('Add new bookmark')).toBeInTheDocument();
    });

    // Close by clicking again
    await userEvent.click(helpButton);

    await waitFor(() => {
      expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
    });
  });

  it('displays empty state when no bookmarks exist', () => {
    render(<Home />);

    expect(screen.getByText('No bookmarks yet')).toBeInTheDocument();
  });

  it('empty state has Add Bookmark CTA button', async () => {
    render(<Home />);

    const emptyStateButton = screen.getByRole('button', { name: /Add your first bookmark/i });
    expect(emptyStateButton).toBeInTheDocument();

    // Click to open form
    await userEvent.click(emptyStateButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('runs migration on mount', () => {
    const { runOnboardingMigration } = require('@/lib/migration');

    render(<Home />);

    expect(runOnboardingMigration).toHaveBeenCalledTimes(1);
  });

  it('keyboard shortcuts help shows all shortcuts', async () => {
    render(<Home />);

    const helpButton = screen.getByLabelText('Show keyboard shortcuts');
    await userEvent.click(helpButton);

    await waitFor(() => {
      expect(screen.getByText('Add new bookmark')).toBeInTheDocument();
      expect(screen.getByText('Focus search')).toBeInTheDocument();
      expect(screen.getByText('Clear & blur')).toBeInTheDocument();
      expect(screen.getByText('Navigate cards')).toBeInTheDocument();
    });
  });

  it('keyboard shortcuts help shows key combinations', async () => {
    render(<Home />);

    const helpButton = screen.getByLabelText('Show keyboard shortcuts');
    await userEvent.click(helpButton);

    await waitFor(() => {
      expect(screen.getByText('⌘')).toBeInTheDocument();
      expect(screen.getByText('N')).toBeInTheDocument();
      expect(screen.getByText('F')).toBeInTheDocument();
    });
  });

  it('closes keyboard shortcuts help on backdrop click', async () => {
    render(<Home />);

    const helpButton = screen.getByLabelText('Show keyboard shortcuts');
    await userEvent.click(helpButton);

    await waitFor(() => {
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });

    // Click backdrop
    const backdrop = document.querySelector('.fixed.z-40');
    if (backdrop) {
      await userEvent.click(backdrop);
    }

    await waitFor(() => {
      expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
    });
  });
});
