"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { getCustomerAuthHeaders } from "@/app/actions/auth";
import { validatePasswordStrength } from "@/lib/auth/password";
import { CUSTOMER_ACCOUNT_REAUTH_COOKIE } from "@/lib/auth/session-cookies";
import { sdk } from "@/lib/medusa/client";

export interface AccountSecurityEvent {
  event_type: string;
  provider: string | null;
  severity: string;
  created_at: string | null;
}

export interface CustomerAccountSecurity {
  customer_id: string;
  account_type: "guest" | "registered";
  email: {
    value: string | null;
    verification_status: string;
    verified_at: string | null;
  };
  providers: Array<{
    provider: string;
    linked: boolean;
    linked_at: string | null;
  }>;
  consolidation: {
    status: string;
    transferred_order_count: number;
    completed_at: string | null;
  };
  last_security_event: AccountSecurityEvent | null;
  recent_security_events: AccountSecurityEvent[];
  warnings: string[];
}

export interface CustomerLoginMethods {
  emailpass: boolean;
  google: boolean;
  providers: string[];
}

type CustomerAccountSecurityResponse = {
  account_security?: CustomerAccountSecurity;
};

type CustomerLoginMethodsResponse = {
  login_methods?: Partial<CustomerLoginMethods>;
};

const DEFAULT_LOGIN_METHODS: CustomerLoginMethods = {
  emailpass: true,
  google: false,
  providers: ["emailpass"],
};

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Please enter a valid email address.");

const getReauthToken = async () => {
  const cookieStore = await cookies();

  return {
    cookieStore,
    token: cookieStore.get(CUSTOMER_ACCOUNT_REAUTH_COOKIE)?.value,
  };
};

function normalizeLoginMethods(
  loginMethods: CustomerLoginMethodsResponse["login_methods"],
): CustomerLoginMethods {
  if (!loginMethods || typeof loginMethods !== "object") {
    return DEFAULT_LOGIN_METHODS;
  }

  const providers = Array.isArray(loginMethods.providers)
    ? loginMethods.providers.filter(
        (provider): provider is string => typeof provider === "string",
      )
    : [];

  return {
    emailpass:
      typeof loginMethods.emailpass === "boolean"
        ? loginMethods.emailpass
        : providers.includes("emailpass"),
    google:
      typeof loginMethods.google === "boolean"
        ? loginMethods.google
        : providers.includes("google"),
    providers,
  };
}

export async function getLoginMethodsAction(): Promise<{
  success: boolean;
  loginMethods: CustomerLoginMethods;
  error?: string;
}> {
  try {
    const authHeaders = await getCustomerAuthHeaders();
    if (!authHeaders) {
      return {
        success: false,
        error: "No session",
        loginMethods: DEFAULT_LOGIN_METHODS,
      };
    }

    const response = await sdk.client.fetch<CustomerLoginMethodsResponse>(
      "/store/customers/me/login-methods",
      { headers: authHeaders },
    );

    return {
      success: true,
      loginMethods: normalizeLoginMethods(response.login_methods),
    };
  } catch (error: unknown) {
    console.error("Login methods error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to retrieve login methods",
      loginMethods: DEFAULT_LOGIN_METHODS,
    };
  }
}

export async function getAccountSecurityAction(): Promise<{
  success: boolean;
  accountSecurity: CustomerAccountSecurity | null;
  error?: string;
}> {
  try {
    const authHeaders = await getCustomerAuthHeaders();
    if (!authHeaders) {
      return {
        success: false,
        accountSecurity: null,
        error: "No session",
      };
    }

    const response = await sdk.client.fetch<CustomerAccountSecurityResponse>(
      "/store/customers/me/account-security",
      { headers: authHeaders },
    );

    return {
      success: true,
      accountSecurity: response.account_security || null,
    };
  } catch (error: unknown) {
    console.error("Account security error:", error);
    return {
      success: false,
      accountSecurity: null,
      error:
        error instanceof Error
          ? error.message
          : "Failed to retrieve account security",
    };
  }
}

export async function setPasswordLoginMethodAction(password: string) {
  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    return { success: false, error: passwordError };
  }

  try {
    const authHeaders = await getCustomerAuthHeaders();
    if (!authHeaders) {
      return { success: false, error: "No session" };
    }

    const { cookieStore, token } = await getReauthToken();
    if (!token) {
      return {
        success: false,
        error: "Verify with Google again before setting a password.",
        requiresGoogleReauth: true,
      };
    }

    await sdk.client.fetch("/store/customers/me/login-methods/emailpass", {
      method: "POST",
      headers: authHeaders,
      body: { password, reauth_token: token },
    });
    cookieStore.delete(CUSTOMER_ACCOUNT_REAUTH_COOKIE);
    revalidatePath("/account/settings");

    return { success: true };
  } catch (error: unknown) {
    console.error("Set password login method error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Password login could not be added",
    };
  }
}

export async function disconnectGoogleLoginMethodAction() {
  try {
    const authHeaders = await getCustomerAuthHeaders();
    if (!authHeaders) {
      return { success: false, error: "No session" };
    }

    const { cookieStore, token } = await getReauthToken();
    if (!token) {
      return {
        success: false,
        error: "Verify with Google again before disconnecting it.",
        requiresGoogleReauth: true,
      };
    }

    await sdk.client.fetch("/store/customers/me/login-methods/google", {
      method: "DELETE",
      headers: {
        ...authHeaders,
        "x-customer-reauth-token": token,
      },
    });
    cookieStore.delete(CUSTOMER_ACCOUNT_REAUTH_COOKIE);
    revalidatePath("/account/settings");

    return { success: true };
  } catch (error: unknown) {
    console.error("Disconnect Google login method error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Google login could not be disconnected",
    };
  }
}

export async function requestEmailChangeAction(
  email: string,
  currentPassword: string,
) {
  const parsedEmail = emailSchema.safeParse(email);
  if (!parsedEmail.success) {
    return {
      success: false,
      error:
        parsedEmail.error.issues[0]?.message ||
        "Please enter a valid email address.",
    };
  }

  if (!currentPassword) {
    return { success: false, error: "Enter your current password." };
  }

  try {
    const authHeaders = await getCustomerAuthHeaders();
    if (!authHeaders) {
      return { success: false, error: "No session" };
    }

    const response = await sdk.client.fetch<{
      sent?: boolean;
      email?: string;
    }>("/store/customers/me/email-change-requests", {
      method: "POST",
      headers: authHeaders,
      body: {
        email: parsedEmail.data,
        current_password: currentPassword,
      },
    });

    return {
      success: response.sent === true,
      email: response.email || parsedEmail.data,
    };
  } catch (error: unknown) {
    console.error("Email change request error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Email change could not be requested",
    };
  }
}
