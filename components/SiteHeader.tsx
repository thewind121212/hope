"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme";
import { AuthHeader } from "@/components/auth";

export function SiteHeader() {
  const pathname = usePathname();
  const isSettingsPage = pathname === "/settings";

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-zinc-200 dark:bg-slate-900/80 dark:border-slate-800">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8 2xl:max-w-7xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" aria-hidden="true" />
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <h1 className="text-2xl font-semibold tracking-tight">Bookmark Vault</h1>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {!isSettingsPage && (
              <Link href="/settings" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 text-sm">
                Settings
              </Link>
            )}
            <ThemeToggle />
            <AuthHeader />
          </div>
        </div>
      </div>
    </header>
  );
}
