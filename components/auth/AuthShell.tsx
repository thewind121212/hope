import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import UseLocallyLink from "@/components/auth/UseLocallyLink";

type AuthShellProps = {
  eyebrow: string;
  heading: string;
  description: string;
  highlights: string[];
  footer: {
    prompt: string;
    href: string;
    label: string;
  };
  children: ReactNode;
};

export default function AuthShell({
  eyebrow,
  heading,
  description,
  highlights,
  footer,
  children,
}: AuthShellProps) {
  return (
    <div className="relative grid min-h-screen w-full grid-cols-1 lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-amber-50 via-white to-rose-50 lg:block dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <div className="pointer-events-none absolute -top-32 -right-16 h-80 w-80 rounded-full bg-gradient-to-br from-amber-300/50 via-rose-200/40 to-sky-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-200/40 via-amber-200/30 to-rose-200/40 blur-3xl" />

        <div className="relative flex h-full flex-col justify-between px-12 py-16 xl:px-20">
          <Link
            href="/"
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <Image
              src="/logo.png"
              alt="Simple Bookmark"
              width={40}
              height={40}
              priority
              className="h-10 w-10 rounded-lg"
            />
            <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
              Simple Bookmark
            </span>
          </Link>

          <div className="space-y-6 animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 shadow-sm ring-1 ring-amber-100 dark:bg-slate-900/70 dark:text-amber-200 dark:ring-slate-800">
              {eyebrow}
            </span>
            <h1 className="text-4xl font-semibold leading-tight text-slate-900 xl:text-5xl dark:text-white">
              {heading}
            </h1>
            <p className="max-w-md text-lg text-slate-600 dark:text-slate-300">
              {description}
            </p>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              {highlights.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Your collection stays yours. Optional vault lock keeps it private end-to-end.
          </p>
        </div>
      </aside>

      <section className="relative flex min-h-screen items-center justify-center bg-white px-4 py-20 sm:px-6 dark:bg-slate-950">
        <div className="w-full max-w-md space-y-6 animate-fade-up">
          <div className="lg:hidden">
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 ring-1 ring-amber-100 dark:bg-slate-900 dark:text-amber-200 dark:ring-slate-800">
              {eyebrow}
            </span>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
              {heading}
            </h1>
          </div>

          <div className="flex justify-center">{children}</div>

          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            <span className="h-px flex-1 bg-zinc-200 dark:bg-slate-800" />
            or
            <span className="h-px flex-1 bg-zinc-200 dark:bg-slate-800" />
          </div>

          <UseLocallyLink />

          <p className="text-center text-sm text-slate-600 dark:text-slate-400">
            {footer.prompt}{" "}
            <Link
              href={footer.href}
              className="font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
            >
              {footer.label}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
