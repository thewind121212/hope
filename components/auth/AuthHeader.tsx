"use client";

import { useAuth } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export function AuthHeader() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return <div className="w-24 h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />;
  }

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-3">
        <UserButton afterSignOutUrl="/" />
      </div>
    );
  }

  return (
    <Link 
      href="/sign-in"
      className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
    >
      Sign In
    </Link>
  );
}
