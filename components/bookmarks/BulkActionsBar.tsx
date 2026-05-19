"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { Space } from "@/lib/types";

interface BulkActionsBarProps {
  selectedCount: number;
  visibleCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  spaces?: Space[];
  onMoveToSpace?: (spaceId: string) => void;
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

export default function BulkActionsBar({
  selectedCount,
  visibleCount,
  onSelectAll,
  onClearSelection,
  onDeleteSelected,
  spaces,
  onMoveToSpace,
}: BulkActionsBarProps) {
  const [moveOpen, setMoveOpen] = useState(false);
  const moveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moveOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (!moveRef.current?.contains(e.target as Node)) {
        setMoveOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoveOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [moveOpen]);

  if (selectedCount === 0) {
    return null;
  }

  const canMove = !!spaces && spaces.length > 0 && !!onMoveToSpace;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
      >
        <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white px-6 py-3 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {selectedCount} selected
          </span>
          <div className="h-4 w-px bg-zinc-300 dark:bg-slate-700" />
          <div className="flex items-center gap-2">
            {selectedCount < visibleCount && (
              <Button
                variant="ghost"
                onClick={onSelectAll}
                className="bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
              >
                Select all ({visibleCount})
              </Button>
            )}
            {canMove && (
              <div ref={moveRef} className="relative">
                <Button
                  variant="ghost"
                  onClick={() => setMoveOpen((v) => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={moveOpen}
                  className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300 dark:hover:bg-indigo-500/25 dark:hover:text-indigo-200"
                >
                  Move to space
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
                {moveOpen && (
                  <div
                    role="listbox"
                    aria-label="Move to space"
                    className="absolute bottom-full left-0 z-30 mb-2 w-56 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
                  >
                    <ul className="max-h-56 overflow-y-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {spaces!.map((space) => (
                        <li key={space.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={false}
                            onClick={() => {
                              onMoveToSpace!(space.id);
                              setMoveOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-zinc-50 dark:text-slate-200 dark:hover:bg-slate-800",
                            )}
                          >
                            {space.color && (
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: space.color }}
                                aria-hidden="true"
                              />
                            )}
                            <span className="truncate">{space.name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <Button
              variant="ghost"
              onClick={onClearSelection}
              className="bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25 dark:hover:text-amber-200"
            >
              Clear selection
            </Button>
            <Button
              variant="ghost"
              onClick={onDeleteSelected}
              className="bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 dark:bg-red-500/15 dark:text-red-300 dark:hover:bg-red-500/25 dark:hover:text-red-200"
            >
              Delete selected
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
