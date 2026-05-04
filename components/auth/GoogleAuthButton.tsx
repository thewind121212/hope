"use client";

import { useState } from "react";
import { useSignIn } from "@clerk/nextjs";

type GoogleAuthButtonProps = {
  label?: string;
};

export default function GoogleAuthButton({
  label = "Continue with Google",
}: GoogleAuthButtonProps) {
  const { signIn, isLoaded } = useSignIn();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (!isLoaded || !signIn) return;
    setError(null);
    setSubmitting(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/app",
      });
    } catch (err) {
      setSubmitting(false);
      const message = err instanceof Error ? err.message : "Could not start Google sign-in.";
      setError(message);
    }
  };

  const disabled = !isLoaded || submitting;

  return (
    <div className="w-full space-y-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="inline-flex w-full items-center justify-center gap-3 rounded-[0.625rem] border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
      >
        <GoogleMark />
        <span>{submitting ? "Redirecting…" : label}</span>
      </button>
      {error && (
        <p className="text-center text-sm text-rose-600 dark:text-rose-400">{error}</p>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961l3.007 2.332C4.672 5.166 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
