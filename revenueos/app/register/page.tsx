import { AuthForm } from "@/components/auth-form";
import { Card, PageHeader } from "@/components/ui";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <PageHeader eyebrow="Customer onboarding" title="Create account" description="Start with a customer account; payments require an approved quotation." />
      <Card>
        <AuthForm mode="register" />
      </Card>
      <p className="mt-4 text-center text-sm text-slate-400">
        Already registered? <a className="text-violet-300" href="/login">Sign in</a>
      </p>
    </main>
  );
}
