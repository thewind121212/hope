"use client";

import Link from "next/link";
import { ArrowLeft, ArrowDownToLine, CloudUpload } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SyncModeToggle } from "@/components/settings/SyncModeToggle";
import { ThemeSettings } from "@/components/settings/ThemeSettings";
import { ApiSettings } from "@/components/settings/ApiSettings";
import Button from "@/components/ui/Button";
import ImportExportModal from "@/components/bookmarks/ImportExportModal";
import { useIncomingSync } from "@/hooks/useIncomingSync";
import { useUiStore } from "@/stores/useUiStore";
import { useLocalMode } from "@/lib/local-mode";

export default function SettingsPage() {
  useIncomingSync();
  const { isSignedIn, isLoaded } = useAuth();
  const { localMode, hydrated } = useLocalMode();
  const openImportExport = useUiStore((s) => s.openImportExport);

  const ready = isLoaded && hydrated;

  return (
    <div className="pt-24">
      <div className="mx-auto max-w-2xl p-4">
        <Link
          href="/app"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to bookmarks
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>

        {!ready ? (
          <div className="space-y-4">
            <div className="h-32 animate-pulse rounded-lg bg-zinc-100 dark:bg-slate-900" />
            <div className="h-32 animate-pulse rounded-lg bg-zinc-100 dark:bg-slate-900" />
          </div>
        ) : isSignedIn ? (
          <>
            <SettingsSection
              title="Cloud Sync"
              description="Choose how your bookmarks are stored and synced"
            >
              <SyncModeToggle />
            </SettingsSection>

            <SettingsSection
              title="API Configuration"
              description="Configure API tokens for AI-powered features"
            >
              <ApiSettings />
            </SettingsSection>

            <SettingsSection
              title="Appearance"
              description="Customize how Simple Bookmark looks"
            >
              <ThemeSettings />
            </SettingsSection>
          </>
        ) : (
          <>
            {localMode && (
              <div className="mb-4">
                <SignInToSync />
              </div>
            )}

            <SettingsSection
              title="Import / Export"
              description="Bring bookmarks in from a JSON file or back yours up"
            >
              <Button
                variant="secondary"
                onClick={openImportExport}
                className="inline-flex items-center gap-2"
              >
                <ArrowDownToLine className="h-4 w-4" />
                Open Import / Export
              </Button>
            </SettingsSection>

            <SettingsSection
              title="Appearance"
              description="Customize how Simple Bookmark looks"
            >
              <ThemeSettings />
            </SettingsSection>
          </>
        )}
      </div>

      <ImportExportModal />
    </div>
  );
}

function SignInToSync() {
  return (
    <div className="relative overflow-hidden rounded-lg border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-amber-50 p-6 dark:border-slate-800 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gradient-to-br from-rose-300/40 via-amber-200/30 to-sky-200/30 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 ring-1 ring-rose-100 dark:bg-slate-900/70 dark:ring-slate-800">
            <CloudUpload className="h-5 w-5 text-rose-600 dark:text-rose-300" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700 dark:text-rose-200">
              Local mode
            </p>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Sync across devices when you&apos;re ready
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Sign in to keep your bookmarks safe and accessible everywhere.
            </p>
          </div>
        </div>
        <Link
          href="/sign-in"
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
