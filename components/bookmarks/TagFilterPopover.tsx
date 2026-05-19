"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TagFilterPopoverProps {
  tagOptions: string[];
  selectedTags: string[];
  onToggle: (tag: string) => void;
  onClear: () => void;
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

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  );
}

export default function TagFilterPopover({
  tagOptions,
  selectedTags,
  onToggle,
  onClear,
  className,
}: TagFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      setQuery("");
    }
  }, [open]);

  const selectedSet = useMemo(() => new Set(selectedTags), [selectedTags]);

  const orderedTags = useMemo(() => {
    const selected = tagOptions.filter((t) => selectedSet.has(t));
    const rest = tagOptions.filter((t) => !selectedSet.has(t));
    return [...selected, ...rest];
  }, [tagOptions, selectedSet]);

  const filteredTags = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orderedTags;
    return orderedTags.filter((t) => t.toLowerCase().includes(q));
  }, [orderedTags, query]);

  const triggerLabel =
    selectedTags.length === 0
      ? "All tags"
      : selectedTags.length === 1
      ? selectedTags[0]
      : `${selectedTags.length} tags`;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Filter by tags"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white pl-3 pr-2 py-2 text-sm text-slate-900 shadow-sm hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
      >
        <span className="truncate text-left">{triggerLabel}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Tag filter"
          className="absolute left-0 z-30 mt-1 w-[200%] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="border-b border-zinc-100 p-2 dark:border-slate-800">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find tag…"
              aria-label="Find tag"
              className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div
            role="listbox"
            aria-multiselectable="true"
            className="max-h-56 overflow-y-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {filteredTags.length === 0 ? (
              <p className="px-1 py-2 text-xs text-slate-500 dark:text-slate-400">
                No tags
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {filteredTags.map((tag) => {
                  const checked = selectedSet.has(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      role="option"
                      aria-selected={checked}
                      onClick={() => onToggle(tag)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                        checked
                          ? "bg-rose-500 text-white hover:bg-rose-600"
                          : "border border-zinc-200 bg-white text-slate-700 hover:border-rose-300 hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-rose-500 dark:hover:bg-rose-500/10",
                      )}
                    >
                      <span className="max-w-[12rem] truncate">{tag}</span>
                      {checked && (
                        <XIcon className="h-3 w-3 shrink-0 opacity-80" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-zinc-100 px-2 py-1.5 text-xs dark:border-slate-800">
            <button
              type="button"
              onClick={onClear}
              disabled={selectedTags.length === 0}
              className="rounded px-2 py-1 text-slate-600 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded px-2 py-1 font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
