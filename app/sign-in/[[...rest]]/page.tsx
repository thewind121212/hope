import AuthShell from '@/components/auth/AuthShell';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';

export const dynamic = 'force-dynamic';

export default function SignInPage() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      heading="Pick up where you left off"
      description="Sign in to reach your spaces, tags, and saved links across every device."
      highlights={[
        "Your bookmarks, synced and ready.",
        "Search across spaces in seconds.",
        "Optional vault lock keeps things private.",
      ]}
      footer={{ prompt: "New to Simple Bookmark?", href: "/sign-up", label: "Create an account" }}
    >
      <GoogleAuthButton label="Continue with Google" />
    </AuthShell>
  );
}
