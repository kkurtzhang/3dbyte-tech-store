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
    error?: string | string[];
    verified?: string | string[];
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

function getFirstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getStatusMessage(params?: Awaited<SignInPageProps["searchParams"]>) {
  const error = getFirstParam(params?.error);
  const verified = getFirstParam(params?.verified);

  if (error === "google_oauth_failed") {
    return {
      tone: "error" as const,
      message:
        "Google sign-in could not be completed. Please try again or use email and password.",
    };
  }

  if (error === "google_oauth_unavailable") {
    return {
      tone: "error" as const,
      message:
        "Google sign-in is temporarily unavailable. Please use email and password for now.",
    };
  }

  if (error === "google_link_required") {
    return {
      tone: "error" as const,
      message:
        "An account with this email already exists. Please sign in with email and password, then connect Google from account settings.",
    };
  }

  if (verified === "1") {
    return {
      tone: "success" as const,
      message: "Email confirmed. You can sign in now.",
    };
  }

  if (verified === "0") {
    return {
      tone: "error" as const,
      message:
        "Email confirmation failed or expired. Sign in to request a new confirmation email.",
    };
  }

  return null;
}

export default async function SignInPage({
  searchParams,
}: SignInPageProps = {}) {
  const session = await getSessionAction();
  const params = await searchParams;

  if (session.success) {
    redirect(getSafeRedirectPath(params?.redirect));
  }

  const statusMessage = getStatusMessage(params);

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground">
          Enter your credentials to sign in to your account
        </p>
      </div>

      {statusMessage && (
        <div
          className={
            statusMessage.tone === "success"
              ? "rounded-sm border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700"
              : "rounded-sm border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
          }
          role="status"
        >
          {statusMessage.message}
        </div>
      )}

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
