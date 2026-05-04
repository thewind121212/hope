export function HomeBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-rose-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900" />

      <div className="absolute -top-32 -left-32 h-[34rem] w-[34rem] rounded-full bg-gradient-to-br from-amber-300/45 via-orange-200/30 to-rose-200/25 blur-3xl animate-[float_22s_ease-in-out_infinite] dark:from-amber-500/15 dark:via-orange-500/10 dark:to-rose-500/10" />
      <div className="absolute top-1/3 -right-40 h-[36rem] w-[36rem] rounded-full bg-gradient-to-br from-rose-300/40 via-pink-200/30 to-fuchsia-200/25 blur-3xl animate-[float_28s_ease-in-out_infinite_reverse] dark:from-rose-500/15 dark:via-pink-500/10 dark:to-fuchsia-500/10" />
      <div className="absolute bottom-0 left-1/4 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-sky-200/35 via-cyan-100/25 to-emerald-200/30 blur-3xl animate-[float_32s_ease-in-out_infinite] dark:from-sky-500/12 dark:via-cyan-500/8 dark:to-emerald-500/12" />
      <div className="absolute top-2/3 right-1/4 h-72 w-72 rounded-full bg-gradient-to-br from-violet-200/30 to-indigo-200/25 blur-3xl animate-[float_26s_ease-in-out_infinite_reverse] dark:from-violet-500/10 dark:to-indigo-500/10" />

      <div
        className="absolute inset-0 text-slate-900 opacity-[0.035] dark:text-white dark:opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(currentColor 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/40 dark:to-slate-950/60" />
    </div>
  );
}
