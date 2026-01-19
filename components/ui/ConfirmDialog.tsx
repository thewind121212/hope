"use client";

import { useEffect, useRef } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
}

/**
 * ConfirmDialog - Reusable confirmation modal for destructive actions
 *
 * Features:
 * - Title and description for context
 * - Configurable button labels
 * - Danger/warning variants for visual feedback
 * - Keyboard support (Esc to cancel, Enter to confirm)
 * - Auto-focus on confirm button
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Auto-focus confirm button when dialog opens
  useEffect(() => {
    if (isOpen && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard: Enter confirms, Esc cancels
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && !event.defaultPrevented) {
        event.preventDefault();
        onConfirm();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onConfirm]);

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const variantStyles = {
    danger: {
      icon: (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <svg
            className="h-6 w-6 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
      ),
      buttonVariant: "danger" as const,
    },
    warning: {
      icon: (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
          <svg
            className="h-6 w-6 text-yellow-600 dark:text-yellow-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>
      ),
      buttonVariant: "primary" as const,
    },
    default: {
      icon: null,
      buttonVariant: "primary" as const,
    },
  };

  const styles = variantStyles[variant];

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdrop={false}>
      <div className="text-center">
        {styles.icon}
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {description}
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            ref={confirmButtonRef}
            variant={styles.buttonVariant}
            onClick={handleConfirm}
            className="w-full sm:w-auto"
          >
            {confirmLabel}
          </Button>
          <Button
            variant="secondary"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            {cancelLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
