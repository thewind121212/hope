import { SettingsSection } from "@/components/settings/SettingsSection";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <SettingsSection
        title="Vault Mode"
        description="End-to-end encrypt your bookmarks and sync across devices"
      >
        <div className="text-sm text-gray-500 italic">
          Vault controls coming soon...
        </div>
      </SettingsSection>

      <SettingsSection
        title="Account"
        description="Manage your account settings"
      >
        <div className="text-sm text-gray-500 italic">
          Account controls coming soon...
        </div>
      </SettingsSection>
    </div>
  );
}
