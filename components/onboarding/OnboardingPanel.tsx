"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { HardDrive, Cloud, Shield, Lock, ArrowRight } from "lucide-react";
import { 
  hasSeenOnboarding, 
  markOnboardingSeen, 
  setPendingOnboardingMode,
  getPendingOnboardingMode,
  clearPendingOnboardingMode,
  type OnboardingMode,
} from "@/lib/onboarding";
import { useVaultStore } from "@/stores/vault-store";
import { useSyncSettingsStore } from "@/stores/sync-settings-store";
import { EnableVaultModal } from "@/components/vault/EnableVaultModal";

export function OnboardingPanel() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedMode, setSelectedMode] = useState<OnboardingMode | null>(null);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const { vaultEnvelope, isUnlocked } = useVaultStore();
  const { setSyncMode, saveToServer } = useSyncSettingsStore();
  const { isSignedIn, isLoaded } = useAuth();

  const vaultEnabled = !!vaultEnvelope;

  const handleCloudModeSetup = useCallback(async () => {
    try {
      setSyncMode('plaintext');
      await saveToServer();
      markOnboardingSeen();
      setIsVisible(false);
    } catch (error) {
      console.error('Failed to setup cloud mode:', error);
    }
  }, [setSyncMode, saveToServer]);

  // Check for pending mode after sign-in
  useEffect(() => {
    setIsMounted(true);
    
    // Check if we have a pending mode from before sign-in
    const pendingMode = getPendingOnboardingMode();
    
    if (pendingMode && isSignedIn) {
      // User just signed in with a pending mode choice
      clearPendingOnboardingMode();
      
      if (pendingMode === 'cloud') {
        // Enable cloud sync mode
        handleCloudModeSetup();
      } else if (pendingMode === 'e2e') {
        // Show vault setup modal
        setShowVaultModal(true);
        setIsVisible(true);
      }
    } else if (!hasSeenOnboarding()) {
      setIsVisible(true);
    }
  }, [isSignedIn, handleCloudModeSetup]);

  const handleContinue = async () => {
    if (!selectedMode) return;

    if (selectedMode === 'local') {
      // Local mode - just mark as seen and close
      markOnboardingSeen();
      setIsVisible(false);
      return;
    }

    if (selectedMode === 'cloud' || selectedMode === 'e2e') {
      if (!isSignedIn) {
        // Store the choice and redirect to sign-in
        setPendingOnboardingMode(selectedMode);
        router.push('/sign-in');
        return;
      }

      // User is signed in
      if (selectedMode === 'cloud') {
        await handleCloudModeSetup();
      } else if (selectedMode === 'e2e') {
        // Show vault setup modal
        setShowVaultModal(true);
      }
    }
  };

  const handleVaultComplete = () => {
    setShowVaultModal(false);
    markOnboardingSeen();
    setIsVisible(false);
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

  // If vault is already enabled and unlocked, don't show onboarding
  if (vaultEnabled && isUnlocked) {
    return null;
  }

  // Show vault modal if needed
  if (showVaultModal) {
    return (
      <EnableVaultModal
        isOpen={showVaultModal}
        onClose={() => {
          setShowVaultModal(false);
          setIsVisible(true);
        }}
        onComplete={handleVaultComplete}
      />
    );
  }

  return (
    <Modal
      isOpen={isVisible}
      onClose={handleSkip}
      closeOnBackdrop={false}
      className="max-w-lg"
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
            Choose how you&apos;d like to store your bookmarks
          </p>
        </div>

        <div className="mb-6 space-y-3 text-left">
          <StorageOption
            icon={<HardDrive className="w-5 h-5" />}
            title="Local Only"
            description="Store bookmarks in your browser. No account needed."
            selected={selectedMode === "local"}
            onClick={() => setSelectedMode("local")}
          />

          <StorageOption
            icon={<Cloud className="w-5 h-5" />}
            title="Cloud Sync"
            description="Sync across devices. Requires sign-in."
            selected={selectedMode === "cloud"}
            onClick={() => setSelectedMode("cloud")}
            requiresAuth
            isSignedIn={isSignedIn}
          />

          <StorageOption
            icon={<Shield className="w-5 h-5" />}
            title="E2E Encrypted Sync"
            description="Maximum security. Only you can read your data."
            selected={selectedMode === "e2e"}
            onClick={() => setSelectedMode("e2e")}
            requiresAuth
            isSignedIn={isSignedIn}
            recommended
          />
        </div>

        {/* Sign-in notice */}
        {(selectedMode === 'cloud' || selectedMode === 'e2e') && !isSignedIn && (
          <div className="mb-6 flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-4 py-3">
            <Lock className="w-4 h-4 flex-shrink-0" />
            <span>You&apos;ll be redirected to sign in to continue</span>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={handleContinue}
            disabled={!selectedMode}
            className="w-full sm:w-auto shadow-lg shadow-rose-500/20 gap-2"
          >
            {(selectedMode === 'cloud' || selectedMode === 'e2e') && !isSignedIn ? (
              <>
                Sign In to Continue
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              'Continue'
            )}
          </Button>
          <Button
            variant="secondary"
            onClick={handleSkip}
            className="w-full sm:w-auto"
          >
            Skip for Now
          </Button>
        </div>

        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          You can change this anytime in Settings
        </p>
      </div>
    </Modal>
  );
}

interface StorageOptionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  requiresAuth?: boolean;
  isSignedIn?: boolean;
  recommended?: boolean;
}

function StorageOption({
  icon,
  title,
  description,
  selected,
  onClick,
  requiresAuth,
  isSignedIn,
  recommended,
}: StorageOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative w-full flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all
        ${selected
          ? "border-rose-500 bg-rose-50 dark:bg-rose-950/30"
          : "border-slate-200 bg-white hover:border-rose-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-rose-600"}
        cursor-pointer
      `}
    >
      <div className="flex-shrink-0">
        <div className={`rounded-lg p-2.5 ${selected ? "bg-rose-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
          {icon}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className={`text-sm font-semibold ${selected ? "text-rose-700 dark:text-rose-300" : "text-slate-900 dark:text-slate-100"}`}>
            {title}
          </h3>
          {recommended && (
            <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Recommended
            </span>
          )}
          {requiresAuth && !isSignedIn && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
              <Lock className="w-3 h-3" />
              Sign in
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          {description}
        </p>
      </div>
      {selected && (
        <div className="absolute right-3 top-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}
    </button>
  );
}
