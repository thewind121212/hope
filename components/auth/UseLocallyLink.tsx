"use client";

import { useRouter } from "next/navigation";
import { setLocalMode } from "@/lib/local-mode";

export default function UseLocallyLink() {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setLocalMode();
    router.push("/app");
  };

  return (
    <a
      href="/app"
      onClick={handleClick}
      className="block w-full rounded-[0.625rem] border border-dashed border-zinc-300 bg-transparent px-4 py-3 text-center text-sm font-medium text-slate-700 transition-colors hover:border-rose-300 hover:bg-rose-50/50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:text-slate-300 dark:hover:border-rose-700 dark:hover:bg-rose-950/30 dark:hover:text-rose-300"
    >
      Continue without an account
      <span className="mt-0.5 block text-xs font-normal text-slate-500 dark:text-slate-500">
        Use Simple Bookmark on this device only — no sync
      </span>
    </a>
  );
}
