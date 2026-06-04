import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionAction } from "@/app/actions/auth";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your account to access order history and saved items.",
};

interface SignInPageProps {
  searchParams?: Promise<{
    redirect?: string | string[];
  }>;
}

function getSafeRedirectPath(value?: string | string[]) {
  const redirectPath = Array.isArray(value) ? value[0] : value;

  if (
    redirectPath?.startsWith("/") &&
    !redirectPath.startsWith("//") &&
    redirectPath !== "/sign-in"
  ) {
    return redirectPath;
  }

  return "/account";
}

export default async function SignInPage({
  searchParams,
}: SignInPageProps = {}) {
  const session = await getSessionAction();

  if (session.success) {
    const params = await searchParams;
    redirect(getSafeRedirectPath(params?.redirect));
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground">
          Enter your credentials to sign in to your account
        </p>
      </div>

      <div className="p-6 border rounded-sm border-cyan-500/10 bg-slate-900/10 dark:bg-slate-950/20 text-card-foreground shadow-[0_0_15px_rgba(6,182,212,0.02)]">
        <LoginForm />
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/sign-up"
          className="font-medium text-primary hover:underline underline-offset-4"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
