"use client";

import { useSearchParams } from "next/navigation";
import { CheckCircle, LinkIcon } from "lucide-react";

import type { CustomerLoginMethods } from "@/app/actions/auth";
import { GoogleIcon } from "@/components/ui/google-icon";
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
import { navigateTo } from "@/lib/browser/navigation";

const DEFAULT_LOGIN_METHODS: CustomerLoginMethods = {
  emailpass: true,
  google: false,
  providers: ["emailpass"],
};

interface LoginMethodsCardProps {
  loginMethods?: CustomerLoginMethods;
}

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <Badge variant={connected ? "secondary" : "outline"}>
      {connected ? "Connected" : "Not connected"}
    </Badge>
  );
}

export function LoginMethodsCard({
  loginMethods = DEFAULT_LOGIN_METHODS,
}: LoginMethodsCardProps) {
  const searchParams = useSearchParams();
  const googleStatus = searchParams.get("google");

  const handleConnectGoogle = () => {
    const params = new URLSearchParams({
      mode: "link",
      redirect: "/account/settings",
    });

    navigateTo(`/auth/google/start?${params.toString()}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Login Methods</CardTitle>
        <CardDescription>
          Manage the ways you can sign in to this account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {googleStatus === "connected" && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>Google has been connected.</AlertDescription>
          </Alert>
        )}

        {googleStatus === "connect_failed" && (
          <Alert variant="destructive">
            <AlertDescription>
              We could not connect that Google account to this customer account.
              Use the same email address or contact support.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 rounded-md border p-4">
            <div>
              <p className="font-medium">Email and password</p>
              <p className="text-sm text-muted-foreground">
                Sign in with your store email and password.
              </p>
            </div>
            <StatusBadge connected={loginMethods.emailpass} />
          </div>

          <div className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <GoogleIcon className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">Google</p>
                <p className="text-sm text-muted-foreground">
                  Use Google as another secure sign-in method.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-center">
              <StatusBadge connected={loginMethods.google} />
              {!loginMethods.google && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleConnectGoogle}
                >
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Connect Google
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
