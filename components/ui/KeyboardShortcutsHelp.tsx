"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Shortcut {
  keys: string[];
  description: string;
}

const shortcuts: Shortcut[] = [
  { keys: ["⌘", "N"], description: "Add new bookmark" },
  { keys: ["⌘", "F"], description: "Focus search" },
  { keys: ["Esc"], description: "Clear & blur" },
  { keys: ["↑", "↓", "←", "→"], description: "Navigate cards" },
];

export interface KeyboardShortcutsHelpProps {
  className?: string;
  position?: "top" | "bottom" | "left" | "right";
}

/**
 * KeyboardShortcutsHelp - Display available keyboard shortcuts
 *
 * Shows all keyboard shortcuts in a tooltip/popover format.
 * Toggleable via button trigger.
 */
export function KeyboardShortcutsHelp({
  className,
  position = "bottom",
}: KeyboardShortcutsHelpProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-slate-400 dark:hover:bg-slate-800"
        aria-label="Show keyboard shortcuts"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 00-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0c.352 0 .648-.273.664-.624A47.964 47.964 0 0019 10.5c0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .355.186.676.401.959.221.29.349.634.349 1.003 0 .355-.186.676-.401.959a1.647 1.647 0 00-.349 1.003v0z"
          />
        </svg>
        <span>Keyboard shortcuts</span>
      </button>

      {/* Popover */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Popover Content */}
            <motion.div
              className={cn(
                "absolute z-50 w-72 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-900",
                position === "bottom" && "top-full left-0 mt-2",
                position === "top" && "bottom-full left-0 mb-2",
                position === "left" && "right-full top-0 mr-2",
                position === "right" && "left-full top-0 ml-2"
              )}
              initial={{ opacity: 0, y: position === "top" ? 10 : -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: position === "top" ? 10 : -10 }}
              transition={{ duration: 0.15 }}
            >
              <h4 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                Keyboard Shortcuts
              </h4>

              <div className="space-y-3">
                {shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      {shortcut.description}
                    </span>

                    <div className="flex gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <kbd
                          key={keyIndex}
                          className="inline-flex min-w-[24px] items-center justify-center rounded border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer note */}
              <p className="mt-4 text-[10px] text-slate-500 dark:text-slate-500">
                Press <kbd className="rounded border border-zinc-300 bg-zinc-50 px-1 py-0.5">Esc</kbd> to close
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default KeyboardShortcutsHelp;
