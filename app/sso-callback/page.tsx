import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function SSOCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
      <div className="flex flex-col items-center gap-3 text-slate-600 dark:text-slate-400">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-rose-500 dark:border-slate-700 dark:border-t-rose-400" />
        <p className="text-sm">Finishing sign-in…</p>
      </div>
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/app"
        signUpFallbackRedirectUrl="/app"
      />
    </div>
  );
}
