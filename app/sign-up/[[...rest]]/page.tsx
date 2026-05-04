import AuthShell from '@/components/auth/AuthShell';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';

export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  return (
    <AuthShell
      eyebrow="Get started"
      heading="Build a bookmark home that stays organized"
      description="Create an account to save links, tag them by project, and find them instantly."
      highlights={[
        "Spaces keep work and personal links separate.",
        "Notes and tags add quick context to every link.",
        "Import an existing collection in one step.",
      ]}
      footer={{ prompt: "Already have an account?", href: "/sign-in", label: "Sign in" }}
    >
      <GoogleAuthButton label="Sign up with Google" />
    </AuthShell>
  );
}
