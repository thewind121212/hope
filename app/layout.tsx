import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import ToastProvider from "@/components/ui/ToastProvider";
import { ThemeScript } from "@/components/theme";
import { ThemeProvider } from "@/hooks/useTheme";
import { SiteHeader } from "@/components/SiteHeader";
import { ClientProviders } from "@/components/ClientProviders";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bookmark Vault",
  description: "Save, view, search, and manage your bookmarks",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <ThemeScript />
        </head>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gray-50 text-slate-900 dark:bg-gray-950 dark:text-slate-100`}>
          <ThemeProvider>
            <ClientProviders>
              <SiteHeader />
              <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 2xl:max-w-7xl">
                {children}
              </main>
            </ClientProviders>
            <ToastProvider />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
