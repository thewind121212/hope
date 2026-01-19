import { ReactNode } from "react";

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-4">
      <h2 className="text-lg font-semibold mb-1">{title}</h2>
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{description}</p>
      )}
      {children}
    </section>
  );
}
