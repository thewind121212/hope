"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { hasSeenOnboarding, markOnboardingSeen } from "@/lib/onboarding";
import { useBookmarks } from "@/hooks/useBookmarks";
import { getDemoBookmarksWithIds } from "@/lib/demoBookmarks";

/**
 * OnboardingPanel - First-run experience for new users
 *
 * Shows friendly tips about the app and offers demo bookmarks.
 * Only displays once (tracked via localStorage flag).
 */
export function OnboardingPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { addBookmark, importBookmarks } = useBookmarks();

  // Only check onboarding flag on client-side mount
  useEffect(() => {
    setIsMounted(true);
    if (!hasSeenOnboarding()) {
      setIsVisible(true);
    }
  }, []);

  const handleStartWithSamples = async () => {
    // Import all demo bookmarks at once
    const demoBookmarks = getDemoBookmarksWithIds();
    const result = await importBookmarks(demoBookmarks);

    if (result.success) {
      markOnboardingSeen();
      setIsVisible(false);
    }
  };

  const handleSkip = () => {
    markOnboardingSeen();
    setIsVisible(false);
  };

  // Prevent flash of content on server-side
  if (!isMounted || !isVisible) {
    return null;
  }

  return (
    <Modal
      isOpen={isVisible}
      onClose={handleSkip}
      closeOnBackdrop={false}
      className="max-w-lg"
    >
      <div className="text-center">
        {/* Welcome Header */}
        <div className="mb-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
            <svg
              className="h-8 w-8 text-rose-600 dark:text-rose-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Welcome to Bookmark Vault!
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Your personal bookmark manager. Here's how to get started:
          </p>
        </div>

        {/* Tips */}
        <div className="mb-8 space-y-4 text-left">
          <Tip
            icon={
              <path d="M12 4.5v15m7.5-7.5h-15" strokeLinecap="round" strokeLinejoin="round" />
            }
            title="Add Bookmarks"
            description="Save links with titles, descriptions, and custom tags for easy organization."
          />
          <Tip
            icon={
              <path
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            }
            title="Search & Filter"
            description="Find anything instantly with powerful search and tag filtering."
          />
          <Tip
            icon={
              <path
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            }
            title="Export Your Data"
            description="Keep your bookmarks safe with export/import functionality."
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={handleStartWithSamples}
            className="w-full sm:w-auto shadow-lg shadow-rose-500/20"
          >
            Start with Sample Bookmarks
          </Button>
          <Button
            variant="secondary"
            onClick={handleSkip}
            className="w-full sm:w-auto"
          >
            Skip, I'll Explore Myself
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface TipProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function Tip({ icon, title, description }: TipProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex-shrink-0">
        <svg
          className="h-5 w-5 text-rose-600 dark:text-rose-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          {icon}
        </svg>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}
