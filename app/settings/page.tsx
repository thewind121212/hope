"use client";

import { SettingsSection } from "@/components/settings/SettingsSection";
import { SyncModeToggle } from "@/components/settings/SyncModeToggle";
import { ThemeSettings } from "@/components/settings/ThemeSettings";
import { useIncomingSync } from "@/hooks/useIncomingSync";

export default function SettingsPage() {
  useIncomingSync();

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-slate-900 dark:text-slate-100">Settings</h1>

      <SettingsSection
        title="Cloud Sync"
        description="Choose how your bookmarks are stored and synced"
      >
        <SyncModeToggle />
      </SettingsSection>

      <SettingsSection
        title="Appearance"
        description="Customize how Bookmark Vault looks"
      >
        <ThemeSettings />
      </SettingsSection>

      <SettingsSection
        title="Account"
        description="Manage your account settings"
      >
        <div className="text-sm text-gray-500 dark:text-slate-400 italic">
          Account controls coming soon...
        </div>
      </SettingsSection>
    </div>
  );
}
