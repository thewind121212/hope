import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "muted";
}

const variantStyles: Record<NonNullable<CardProps["variant"]>, string> = {
  default:
    "bg-white text-slate-900 shadow-sm border border-zinc-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800",
  muted:
    "bg-zinc-50 text-slate-900 border border-zinc-200 dark:bg-slate-950 dark:text-slate-100 dark:border-slate-800",
};

export default function Card({
  className,
  variant = "default",
  ...props
}: CardProps) {
  return (
    <div
      className={cn("rounded-xl p-5", variantStyles[variant], className)}
      {...props}
    />
  );
}
