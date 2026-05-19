"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { LogOut, Settings as SettingsIcon } from "lucide-react";
import { clearAllVaultData } from "@/lib/auth-cleanup";
import { useUiStore } from "@/stores/useUiStore";
import { useResetBookmarksStateSafe } from "@/hooks/useBookmarks";
import { useSyncSettingsStore } from "@/stores/sync-settings-store";
import { useLocalMode } from "@/lib/local-mode";
import { cn } from "@/lib/utils";

function getInitial(name: string | null | undefined, email: string | null | undefined): string {
  if (name && name.trim().length > 0) {
    return name.trim()[0].toUpperCase();
  }
  if (email && email.length > 0) {
    return email[0].toUpperCase();
  }
  return "U";
}

export function AuthHeader() {
  const { isSignedIn, isLoaded, signOut } = useAuth();
  const { user } = useUser();
  const { localMode, hydrated } = useLocalMode();
  const resetBookmarks = useResetBookmarksStateSafe();
  const resetUiState = useUiStore((state) => state.resetAllState);

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  if (!isLoaded || !hydrated) {
    return (
      <div className="h-9 w-9 animate-pulse rounded-full bg-zinc-200 dark:bg-slate-700" />
    );
  }

  if (!isSignedIn && localMode) {
    return null;
  }

  const handleSignOut = async () => {
    clearAllVaultData();
    resetBookmarks?.();
    resetUiState();
    useSyncSettingsStore.getState().reset();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await signOut({ redirectUrl: "/" });
  };

  if (isSignedIn) {
    const email = user?.primaryEmailAddress?.emailAddress ?? null;
    const fullName =
      user?.fullName ??
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
      null;
    const displayName = fullName && fullName.trim().length > 0 ? fullName : email;
    const imageUrl = user?.imageUrl ?? null;
    const initial = getInitial(fullName, email);

    return (
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Account menu"
          className={cn(
            "flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-gradient-to-br from-rose-500 to-rose-600 text-sm font-semibold text-white shadow-sm transition hover:scale-105 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:ring-offset-slate-900",
          )}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={displayName ?? "User"}
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{initial}</span>
          )}
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center gap-3 border-b border-zinc-100 px-3 py-3 dark:border-slate-800">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-rose-500 to-rose-600 text-base font-semibold text-white">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt={displayName ?? "User"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{initial}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                {displayName && (
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {displayName}
                  </p>
                )}
                {email && (
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {email}
                  </p>
                )}
              </div>
            </div>

            <div className="py-1">
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-zinc-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <SettingsIcon className="h-4 w-4" />
                Settings
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  handleSignOut();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href="/sign-in"
      className="rounded-lg bg-rose-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 dark:ring-offset-slate-900"
    >
      Sign in
    </Link>
  );
}
