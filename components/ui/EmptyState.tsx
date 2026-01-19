import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

export default function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className,
  icon,
}: EmptyStateProps) {
  const defaultIcon = (
    <svg
      className="h-12 w-12 text-zinc-400 dark:text-slate-600"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-12 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100",
        className
      )}
    >
      <div className="mb-4">{icon || defaultIcon}</div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
        {title}
      </h3>
      {description && (
        <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button className="mt-6 shadow-lg shadow-rose-500/20" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
