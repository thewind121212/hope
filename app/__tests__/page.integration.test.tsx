/**
 * @jest-environment jsdom
 */
import { v4 as uuidv4 } from "uuid";

jest.mock("uuid", () => ({
  v4: jest.fn(),
}));
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '@/app/page';

// Mock all dependencies
jest.mock('@/hooks/useBookmarks', () => ({
  useBookmarks: () => ({
    bookmarks: [],
    allBookmarks: [],
    pendingAdds: new Set(),
    pendingDeletes: new Set(),
    isLoading: false,
    errorMessage: null,
    addBookmark: jest.fn(() => ({ success: true, bookmark: {} })),
    deleteBookmark: jest.fn(() => ({ success: true })),
    updateBookmark: jest.fn(() => ({ success: true })),
    importBookmarks: jest.fn(() => Promise.resolve({ success: true })),
    clearError: jest.fn(),
  }),
  BookmarksProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: jest.fn(),
}));

jest.mock('@/lib/migration', () => ({
  runOnboardingMigration: jest.fn(),
}));

jest.mock('@/components/onboarding/OnboardingPanel', () => ({
  OnboardingPanel: () => null,
}));

describe('Home Page Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('runs migration on mount', async () => {
    const { runOnboardingMigration } = await import('@/lib/migration');

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
