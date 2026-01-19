"use client";

import { cloneElement, useEffect, isValidElement, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
}

export default function DropdownMenu({
  trigger,
  children,
  align = "end",
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !triggerRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const triggerElement = isValidElement(trigger)
    ? cloneElement(trigger as React.ReactElement<any>, {
        ref: triggerRef,
        onClick: (e: React.MouseEvent) => {
          setIsOpen(!isOpen);
          // Also call the original onClick if it exists
          const originalOnClick = (trigger as React.ReactElement<any>).props.onClick;
          if (originalOnClick) {
            originalOnClick(e);
          }
        },
        "aria-expanded": isOpen,
        "aria-haspopup": true,
      })
    : trigger;

  return (
    <div className="relative inline-block">
      {triggerElement}
      {isOpen && (
        <div
          ref={menuRef}
          className={cn(
            "absolute z-50 mt-1 w-48 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900",
            align === "end" ? "right-0" : "left-0"
          )}
          role="menu"
          aria-orientation="vertical"
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface DropdownMenuItemProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: "default" | "danger";
  disabled?: boolean;
}

export function DropdownMenuItem({
  onClick,
  children,
  variant = "default",
  disabled = false,
}: DropdownMenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent",
        variant === "danger"
          ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          : "text-slate-700 hover:bg-zinc-100 dark:text-slate-200 dark:hover:bg-slate-800"
      )}
      role="menuitem"
    >
      {children}
    </button>
  );
}
