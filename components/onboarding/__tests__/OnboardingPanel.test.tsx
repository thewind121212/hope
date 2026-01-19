import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingPanel } from '../OnboardingPanel';

// Mock dependencies
vi.mock('@/lib/onboarding', () => ({
  hasSeenOnboarding: vi.fn(() => false),
  markOnboardingSeen: vi.fn(),
}));

vi.mock('@/hooks/useBookmarks', () => ({
  useBookmarks: vi.fn(() => ({
    addBookmark: vi.fn(),
    importBookmarks: vi.fn(() => Promise.resolve({ success: true })),
  })),
}));

vi.mock('@/lib/demoBookmarks', () => ({
  getDemoBookmarksWithIds: vi.fn(() => [
    { id: 'demo-0', title: 'GitHub', url: 'https://github.com', tags: ['dev'], createdAt: '2024-01-01' },
  ]),
}));

import { hasSeenOnboarding, markOnboardingSeen } from '@/lib/onboarding';
import { useBookmarks } from '@/hooks/useBookmarks';

describe('OnboardingPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when onboarding not seen', async () => {
    (hasSeenOnboarding as vi.Mock).mockReturnValue(false);

    render(<OnboardingPanel />);

    await waitFor(() => {
      expect(screen.getByText('Welcome to Bookmark Vault!')).toBeInTheDocument();
    });
  });

  it('does not render when onboarding seen', async () => {
    (hasSeenOnboarding as vi.Mock).mockReturnValue(true);

    const { container } = render(<OnboardingPanel />);

    await waitFor(() => {
      expect(screen.queryByText('Welcome to Bookmark Vault!')).not.toBeInTheDocument();
    });
    expect(container.firstChild).toBeNull();
  });

  it('shows all tips', async () => {
    (hasSeenOnboarding as vi.Mock).mockReturnValue(false);

    render(<OnboardingPanel />);

    await waitFor(() => {
      expect(screen.getByText('Add Bookmarks')).toBeInTheDocument();
      expect(screen.getByText('Search & Filter')).toBeInTheDocument();
      expect(screen.getByText('Export Your Data')).toBeInTheDocument();
    });
  });

  it('marks onboarding as seen and closes on skip', async () => {
    (hasSeenOnboarding as vi.Mock).mockReturnValue(false);
    const mockImportBookmarks = vi.fn(() => Promise.resolve({ success: true }));
    (useBookmarks as vi.Mock).mockReturnValue({
      importBookmarks: mockImportBookmarks,
    });

    render(<OnboardingPanel />);

    const skipButton = await screen.findByText('Skip, I\'ll Explore Myself');
    await userEvent.click(skipButton);

    expect(markOnboardingSeen).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText('Welcome to Bookmark Vault!')).not.toBeInTheDocument();
    });
  });

  it('loads demo bookmarks on start with samples', async () => {
    (hasSeenOnboarding as vi.Mock).mockReturnValue(false);
    const mockImportBookmarks = vi.fn(() => Promise.resolve({ success: true }));
    (useBookmarks as vi.Mock).mockReturnValue({
      importBookmarks: mockImportBookmarks,
    });

    render(<OnboardingPanel />);

    const samplesButton = await screen.findByText('Start with Sample Bookmarks');
    await userEvent.click(samplesButton);

    await waitFor(() => {
      expect(mockImportBookmarks).toHaveBeenCalled();
      expect(markOnboardingSeen).toHaveBeenCalled();
    });
  });
});
