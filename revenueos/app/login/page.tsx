import { AuthForm } from "@/components/auth-form";
import { Card, PageHeader } from "@/components/ui";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <PageHeader eyebrow="Secure access" title="Sign in" description="Access your RivicQ customer portal or staff console." />
      <Card>
        <AuthForm mode="login" />
      </Card>
      <p className="mt-4 text-center text-sm text-slate-400">
        New to RivicQ? <a className="text-violet-300" href="/register">Create an account</a>
      </p>
    </main>
  );
}
