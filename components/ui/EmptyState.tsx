import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-xl border border-zinc-200 bg-white p-8 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100",
        className
      )}
    >
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
        {title}
      </h3>
      {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
      {actionLabel && onAction && (
        <Button className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
