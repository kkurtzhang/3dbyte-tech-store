"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, KeyRound, LinkIcon, Loader2, Unlink } from "lucide-react";

import {
  disconnectGoogleLoginMethodAction,
  requestEmailChangeAction,
  setPasswordLoginMethodAction,
  type CustomerAccountSecurity,
  type CustomerLoginMethods,
} from "@/app/actions/account-security";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GoogleIcon } from "@/components/ui/google-icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { navigateTo } from "@/lib/browser/navigation";

import { AccountSecurityOverview } from "./account-security-overview";

const DEFAULT_LOGIN_METHODS: CustomerLoginMethods = {
  emailpass: true,
  google: false,
  providers: ["emailpass"],
};

interface LoginMethodsCardProps {
  loginMethods?: CustomerLoginMethods;
  accountSecurity?: CustomerAccountSecurity | null;
}

type Message = {
  type: "success" | "error";
  text: string;
};

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <Badge variant={connected ? "secondary" : "outline"}>
      {connected ? "Connected" : "Not connected"}
    </Badge>
  );
}

export function LoginMethodsCard({
  loginMethods = DEFAULT_LOGIN_METHODS,
  accountSecurity,
}: LoginMethodsCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const googleStatus = searchParams.get("google");
  const emailStatus = searchParams.get("email");
  const hasRecentGoogleVerification = googleStatus === "connected";
  const [message, setMessage] = useState<Message | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startGoogleReauthentication = () => {
    const params = new URLSearchParams({
      mode: "link",
      redirect: "/account/settings",
    });

    navigateTo(`/auth/google/start?${params.toString()}`);
  };

  const handleSetPassword = async (formData: FormData) => {
    const password = String(formData.get("password") || "");
    const confirmation = String(formData.get("password_confirmation") || "");

    if (password !== confirmation) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    const result = await setPasswordLoginMethodAction(password);
    setIsSubmitting(false);

    if (!result.success) {
      setMessage({
        type: "error",
        text: result.error || "Password login could not be added.",
      });
      return;
    }

    setMessage({ type: "success", text: "Password login is now available." });
    router.replace("/account/settings");
    router.refresh();
  };

  const handleDisconnectGoogle = async () => {
    setIsSubmitting(true);
    setMessage(null);
    const result = await disconnectGoogleLoginMethodAction();
    setIsSubmitting(false);

    if (!result.success) {
      setMessage({
        type: "error",
        text: result.error || "Google login could not be disconnected.",
      });
      return;
    }

    setMessage({ type: "success", text: "Google login was disconnected." });
    router.replace("/account/settings");
    router.refresh();
  };

  const handleEmailChange = async (formData: FormData) => {
    const email = String(formData.get("new_email") || "");
    const currentPassword = String(formData.get("email_change_password") || "");

    setIsSubmitting(true);
    setMessage(null);
    const result = await requestEmailChangeAction(email, currentPassword);
    setIsSubmitting(false);

    if (!result.success) {
      setMessage({
        type: "error",
        text: result.error || "Email change could not be requested.",
      });
      return;
    }

    setMessage({
      type: "success",
      text: `We sent a confirmation link to ${result.email}.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Login Methods</CardTitle>
        <CardDescription>
          Manage verified ways to access your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AccountSecurityOverview accountSecurity={accountSecurity} />

        {googleStatus === "connected" && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Google reauthentication is complete. Sensitive account controls
              are available briefly.
            </AlertDescription>
          </Alert>
        )}

        {googleStatus === "connect_failed" && (
          <Alert variant="destructive">
            <AlertDescription>
              We could not verify that Google account. Use the same email
              address as this customer account or contact support.
            </AlertDescription>
          </Alert>
        )}

        {emailStatus === "changed" && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your account email was updated successfully.
            </AlertDescription>
          </Alert>
        )}

        {emailStatus === "change_failed" && (
          <Alert variant="destructive">
            <AlertDescription>
              We could not update your account email. Request a new confirmation
              link and try again.
            </AlertDescription>
          </Alert>
        )}

        {message && (
          <Alert variant={message.type === "error" ? "destructive" : "default"}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <KeyRound className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">Email and password</p>
                <p className="text-sm text-muted-foreground">
                  Sign in with your verified store email and password.
                </p>
              </div>
            </div>
            <StatusBadge connected={loginMethods.emailpass} />
          </div>

          <div className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <GoogleIcon className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">Google</p>
                <p className="text-sm text-muted-foreground">
                  Use the Google account with the same verified email.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 self-start sm:self-center">
              <StatusBadge connected={loginMethods.google} />
              {!loginMethods.google ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={startGoogleReauthentication}
                >
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Connect Google
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={startGoogleReauthentication}
                >
                  <GoogleIcon className="mr-2 h-4 w-4" />
                  Reauthenticate with Google
                </Button>
              )}
              {loginMethods.google &&
                loginMethods.emailpass &&
                hasRecentGoogleVerification && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={handleDisconnectGoogle}
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Unlink className="mr-2 h-4 w-4" />
                    )}
                    Disconnect Google
                  </Button>
                )}
            </div>
          </div>
        </div>

        {!loginMethods.emailpass &&
          loginMethods.google &&
          hasRecentGoogleVerification && (
            <form
              action={handleSetPassword}
              className="space-y-4 border-t pt-4"
            >
              <div>
                <p className="font-medium">Set a password</p>
                <p className="text-sm text-muted-foreground">
                  Add password login before disconnecting Google.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password_confirmation">
                    Confirm password
                  </Label>
                  <Input
                    id="password_confirmation"
                    name="password_confirmation"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Use at least 12 characters with upper and lowercase letters, a
                number, and a symbol.
              </p>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Set Password
              </Button>
            </form>
          )}

        {loginMethods.emailpass && !loginMethods.google && (
          <form action={handleEmailChange} className="space-y-4 border-t pt-4">
            <div>
              <p className="font-medium">Change account email</p>
              <p className="text-sm text-muted-foreground">
                Confirm the new address before it replaces your current login.
                Previous guest orders are not claimed after an email change.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new_email">New email address</Label>
                <Input
                  id="new_email"
                  name="new_email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email_change_password">
                  Current password for email change
                </Label>
                <Input
                  id="email_change_password"
                  name="email_change_password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>
            <Button type="submit" variant="outline" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send Confirmation
            </Button>
          </form>
        )}

        {loginMethods.google && (
          <p className="border-t pt-4 text-sm text-muted-foreground">
            To change your account email, first add password login if needed,
            verify with Google, and disconnect Google. You can reconnect Google
            after confirming the new email.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
