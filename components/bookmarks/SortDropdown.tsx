"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SortDropdownProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  className?: string;
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 011.42-1.42L8.5 12.085l6.79-6.795a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function SortDropdown<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SortDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);
  const triggerLabel = current?.label ?? "";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white pl-3 pr-2 py-2 text-sm text-slate-900 shadow-sm hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
      >
        <span className="truncate text-left">{triggerLabel}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute right-0 z-30 mt-1 w-[200%] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <ul className="max-h-56 overflow-y-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {options.map((opt) => {
              const selected = opt.value === value;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-zinc-50 dark:hover:bg-slate-800",
                      selected
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-slate-700 dark:text-slate-200",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                        selected
                          ? "border-rose-500 bg-rose-500 text-white"
                          : "border-zinc-300 dark:border-slate-600",
                      )}
                      aria-hidden="true"
                    >
                      {selected && <CheckIcon className="h-3 w-3" />}
                    </span>
                    <span className="truncate">{opt.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
