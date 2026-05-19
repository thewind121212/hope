"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Lock, Settings } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { AuthHeader } from "@/components/auth";
import { useVaultStore } from "@/stores/vault-store";
import { useSyncSettingsStore } from "@/stores/sync-settings-store";

const HIDDEN_HEADER_ROUTES = ["/sign-in", "/sign-up", "/sso-callback"];

export function SiteHeader() {
  const pathname = usePathname();
  const isSettingsPage = pathname === "/settings";
  const isAppRoute = pathname?.startsWith("/app");
  const isAuthRoute = HIDDEN_HEADER_ROUTES.some((route) => pathname?.startsWith(route));
  const { vaultEnvelope, isUnlocked, lock } = useVaultStore();
  const { syncMode } = useSyncSettingsStore();
  const { isSignedIn } = useAuth();

  if (isAuthRoute) return null;

  const showQuickLock = syncMode === 'e2e' && vaultEnvelope && isUnlocked;

  const handleQuickLock = () => {
    lock();
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="w-full px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link
            href={isAppRoute ? "/app" : "/"}
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <Image
              src="/logo.png"
              alt="Simple Bookmark"
              width={36}
              height={36}
              priority
              className="h-9 w-9 rounded-lg"
            />
            <h1 className="text-2xl font-semibold tracking-tight">Simple Bookmark</h1>
          </Link>
          <div className="flex items-center gap-2">
            {showQuickLock && (
              <button
                type="button"
                onClick={handleQuickLock}
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Lock vault"
                aria-label="Lock vault"
              >
                <Lock className="w-5 h-5" />
              </button>
            )}
            {!isSettingsPage && !isSignedIn && (
              <Link
                href="/settings"
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Settings"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5" />
              </Link>
            )}
            <AuthHeader />
          </div>
        </div>
      </div>
    </header>
  );
}
