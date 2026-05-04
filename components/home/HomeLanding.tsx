"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { isLocalMode } from "@/lib/local-mode";

type HomeLandingProps = {
  variant?: "app" | "home";
};

const highlights = [
  {
    title: "Spaces",
    description: "Keep work, personal, and research links separate.",
  },
  {
    title: "Smart search",
    description: "Find the right link fast with filters and tags.",
  },
  {
    title: "Quick context",
    description: "Add notes and tags so links stay useful later.",
  },
  {
    title: "Private by design",
    description: "Optional vault lock keeps your collection yours.",
  },
];

const useCases = [
  "Build a research library for articles and papers.",
  "Create a project hub with the docs you open daily.",
  "Organize personal reading lists without losing track.",
  "Export collections when you need to share or move tools.",
];

export default function HomeLanding({ variant = "app" }: HomeLandingProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const [localMode, setLocalModeState] = useState(false);

  useEffect(() => {
    setLocalModeState(isLocalMode());
  }, []);

  const handleScroll = () => {
    document.getElementById("bookmarks")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const isHome = variant === "home";
  const hasAccess = isSignedIn || localMode;
  const ctaReady = isLoaded;

  return (
    <section className="space-y-10">
      <div className="relative overflow-hidden rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-rose-50 p-8 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <div className="pointer-events-none absolute -top-32 right-0 h-64 w-64 rounded-full bg-gradient-to-br from-amber-300/50 via-rose-200/40 to-sky-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-8 h-56 w-56 rounded-full bg-gradient-to-br from-emerald-200/40 via-amber-200/30 to-rose-200/40 blur-3xl" />

        <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6 animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 shadow-sm ring-1 ring-amber-100 dark:bg-slate-900/70 dark:text-amber-200 dark:ring-slate-800">
              Simple Bookmark
            </span>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold text-slate-900 dark:text-white sm:text-5xl">
                Your bookmarks, finally under control
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                Save, tag, and organize links into focused spaces so you can find the right resource in seconds.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {isHome ? (
                !ctaReady ? (
                  <span
                    aria-hidden
                    className="inline-block h-12 w-48 animate-pulse rounded-lg bg-zinc-200/70 dark:bg-slate-800"
                  />
                ) : hasAccess ? (
                  <Link
                    href="/app"
                    className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
                  >
                    Open your bookmarks
                  </Link>
                ) : (
                  <Link
                    href="/sign-in"
                    className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
                  >
                    Let&apos;s get started
                  </Link>
                )
              ) : (
                <Button onClick={handleScroll} className="px-6 py-3 text-base">
                  Go to your bookmarks
                </Button>
              )}
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Start with a single link or import a full collection.
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-400">
              <span className="rounded-full bg-white/70 px-3 py-1 shadow-sm ring-1 ring-zinc-100 dark:bg-slate-900/70 dark:ring-slate-800">
                Spaces
              </span>
              <span className="rounded-full bg-white/70 px-3 py-1 shadow-sm ring-1 ring-zinc-100 dark:bg-slate-900/70 dark:ring-slate-800">
                Notes + tags
              </span>
              <span className="rounded-full bg-white/70 px-3 py-1 shadow-sm ring-1 ring-zinc-100 dark:bg-slate-900/70 dark:ring-slate-800">
                Filters
              </span>
              <span className="rounded-full bg-white/70 px-3 py-1 shadow-sm ring-1 ring-zinc-100 dark:bg-slate-900/70 dark:ring-slate-800">
                Quick preview
              </span>
            </div>
          </div>

          <Card className="relative overflow-hidden border-amber-100/80 bg-white/90 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">Today</p>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                  Focused spaces keep everything clear
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Switch between projects, see what is pinned, and jump right back in.
                </p>
              </div>
              <div className="grid gap-3">
                {[
                  { label: "Research", meta: "12 links" },
                  { label: "Design Inspo", meta: "8 links" },
                  { label: "Launch Prep", meta: "5 links" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-xl border border-zinc-100 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <span className="font-medium">{item.label}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{item.meta}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Everything stays ready for later
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {highlights.map((item) => (
          <Card key={item.title} variant="muted" className="space-y-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {item.title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">{item.description}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="space-y-4 border-amber-100/80 bg-amber-50/60 dark:border-slate-800 dark:bg-slate-900/60">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">How people use it</h3>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            {useCases.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-amber-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="space-y-4 border-rose-100/80 bg-rose-50/60 dark:border-slate-800 dark:bg-slate-900/60">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Getting started</h3>
          <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li>1. Add your first bookmark with a title and URL.</li>
            <li>2. Drop it into a space and tag it for later.</li>
            <li>3. Use search and filters to keep momentum.</li>
            <li>4. Import more links whenever you are ready.</li>
          </ol>
        </Card>
      </div>
    </section>
  );
}
