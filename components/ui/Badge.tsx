import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "accent";
}

const toneStyles: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral:
    "bg-zinc-100 text-slate-700 border border-transparent dark:bg-slate-800 dark:text-slate-200",
  accent:
    "bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-500/15 dark:text-rose-200 dark:border-rose-500/30",
};

export default function Badge({
  className,
  tone = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneStyles[tone],
        className
      )}
      {...props}
    />
  );
}
