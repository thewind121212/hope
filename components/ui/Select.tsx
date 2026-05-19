"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options: SelectOption[];
  containerClassName?: string;
}

export default function Select({
  label,
  helperText,
  error,
  options,
  containerClassName,
  className,
  id,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const helperId = helperText ? `${selectId}-helper` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1", containerClassName)}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-sm font-medium text-slate-800 dark:text-slate-100"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "w-full appearance-none rounded-lg border border-zinc-200 bg-white pl-3 pr-9 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
          "bg-no-repeat bg-[length:1rem_1rem] bg-[position:right_0.75rem_center]",
          "bg-[image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%2364748b%22><path fill-rule=%22evenodd%22 d=%22M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z%22 clip-rule=%22evenodd%22/></svg>')]",
          error ? "border-red-500 focus-visible:ring-red-500" : "",
          className
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText && !error && (
        <p id={helperId} className="text-xs text-slate-500 dark:text-slate-400">
          {helperText}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
