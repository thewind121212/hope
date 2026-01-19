"use client";

import { SignInButton as ClerkSignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui";

export function SignInButton() {
  return (
    <ClerkSignInButton mode="modal">
      <Button variant="primary">Sign In</Button>
    </ClerkSignInButton>
  );
}
