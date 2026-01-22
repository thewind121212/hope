"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { HardDrive, LogIn } from "lucide-react";
import { 
  hasSeenOnboarding, 
  markOnboardingSeen, 
} from "@/lib/onboarding";

const PENDING_MODE_KEY = 'bookmark-vault-pending-mode';

export function OnboardingPanel() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { isSignedIn, isLoaded } = useAuth();

  // Check onboarding state on mount and handle post-sign-in
  useEffect(() => {
    setIsMounted(true);
    
    // If user just signed in, clear any old pending mode and refresh
    if (isSignedIn && isLoaded) {
      // Clear any leftover pending mode from old onboarding flow
      try {
        localStorage.removeItem(PENDING_MODE_KEY);
      } catch {
        // Silently fail
      }
      
      // Mark onboarding as seen and hard refresh
      if (!hasSeenOnboarding()) {
        markOnboardingSeen();
        window.location.href = '/';
        return;
      }
    }
    
    // Show onboarding if not seen and not signed in
    if (!hasSeenOnboarding() && !isSignedIn) {
      setIsVisible(true);
    }
  }, [isSignedIn, isLoaded]);

  const handleLocalOnly = () => {
    markOnboardingSeen();
    setIsVisible(false);
  };

  const handleSignIn = () => {
    router.push('/sign-in');
  };

  const handleSkip = () => {
    markOnboardingSeen();
    setIsVisible(false);
  };

  if (!isMounted || !isVisible) {
    return null;
  }

  if (!isLoaded) {
    return null;
  }

  return (
    <Modal
      isOpen={isVisible}
      onClose={handleSkip}
      closeOnBackdrop={false}
      className="max-w-md"
    >
      <div className="text-center">
        <div className="mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
            <svg
              className="h-8 w-8 text-rose-600 dark:text-rose-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Welcome to Bookmark Vault
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Save and organize your bookmarks securely
          </p>
        </div>

        <div className="mb-6 space-y-3">
          {/* Local Only Option */}
          <button
            type="button"
            onClick={handleLocalOnly}
            className="w-full flex items-center gap-4 rounded-xl border-2 border-slate-200 bg-white hover:border-rose-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-rose-600 p-4 text-left transition-all"
          >
            <div className="flex-shrink-0">
              <div className="rounded-lg p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                <HardDrive className="w-5 h-5" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Continue with Local Only
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Store bookmarks in your browser. No account needed.
              </p>
            </div>
          </button>

          {/* Sign In Option */}
          <button
            type="button"
            onClick={handleSignIn}
            className="w-full flex items-center gap-4 rounded-xl border-2 border-slate-200 bg-white hover:border-rose-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-rose-600 p-4 text-left transition-all"
          >
            <div className="flex-shrink-0">
              <div className="rounded-lg p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                <LogIn className="w-5 h-5" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Sign In
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Sync across devices and enable cloud backup.
              </p>
            </div>
          </button>
        </div>

        <Button
          variant="secondary"
          onClick={handleSkip}
          className="w-full"
        >
          Skip for Now
        </Button>

        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          You can change this anytime in Settings
        </p>
      </div>
    </Modal>
  );
}
