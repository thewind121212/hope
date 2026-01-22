/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingPanel } from '@/components/onboarding/OnboardingPanel';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(() => ({
    isSignedIn: false,
    isLoaded: true,
  })),
}));

// Mock onboarding lib
jest.mock('@/lib/onboarding', () => ({
  hasSeenOnboarding: jest.fn(() => false),
  markOnboardingSeen: jest.fn(),
}));

import { useAuth } from '@clerk/nextjs';
import { hasSeenOnboarding, markOnboardingSeen } from '@/lib/onboarding';

describe('OnboardingPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      isSignedIn: false,
      isLoaded: true,
    });
  });

  it('renders when onboarding not seen and not signed in', async () => {
    (hasSeenOnboarding as jest.Mock).mockReturnValue(false);

    render(<OnboardingPanel />);

    await waitFor(() => {
      expect(screen.getByText('Welcome to Bookmark Vault')).toBeInTheDocument();
    });
  });

  it('does not render when onboarding already seen', async () => {
    (hasSeenOnboarding as jest.Mock).mockReturnValue(true);

    const { container } = render(<OnboardingPanel />);

    await waitFor(() => {
      expect(screen.queryByText('Welcome to Bookmark Vault')).not.toBeInTheDocument();
    });
    expect(container.firstChild).toBeNull();
  });

  it('shows two options: Local Only and Sign In', async () => {
    (hasSeenOnboarding as jest.Mock).mockReturnValue(false);

    render(<OnboardingPanel />);

    await waitFor(() => {
      expect(screen.getByText('Continue with Local Only')).toBeInTheDocument();
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });
  });

  it('marks onboarding as seen and closes when clicking Local Only', async () => {
    (hasSeenOnboarding as jest.Mock).mockReturnValue(false);

    render(<OnboardingPanel />);

    const localOnlyButton = await screen.findByText('Continue with Local Only');
    await userEvent.click(localOnlyButton);

    expect(markOnboardingSeen).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText('Welcome to Bookmark Vault')).not.toBeInTheDocument();
    });
  });

  it('redirects to sign-in when clicking Sign In', async () => {
    (hasSeenOnboarding as jest.Mock).mockReturnValue(false);

    render(<OnboardingPanel />);

    const signInButton = await screen.findByText('Sign In');
    await userEvent.click(signInButton);

    expect(mockPush).toHaveBeenCalledWith('/sign-in');
  });

  it('marks onboarding as seen and closes on Skip', async () => {
    (hasSeenOnboarding as jest.Mock).mockReturnValue(false);

    render(<OnboardingPanel />);

    const skipButton = await screen.findByText('Skip for Now');
    await userEvent.click(skipButton);

    expect(markOnboardingSeen).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText('Welcome to Bookmark Vault')).not.toBeInTheDocument();
    });
  });

  it('does not show onboarding when user is signed in', async () => {
    (hasSeenOnboarding as jest.Mock).mockReturnValue(false);
    (useAuth as jest.Mock).mockReturnValue({
      isSignedIn: true,
      isLoaded: true,
    });

    render(<OnboardingPanel />);

    // When signed in, onboarding should not be visible (it triggers a hard refresh)
    await waitFor(() => {
      expect(screen.queryByText('Welcome to Bookmark Vault')).not.toBeInTheDocument();
    });
  });
});
