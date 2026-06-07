"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  CUSTOMER_TOKEN_COOKIE,
  SESSION_COOKIE,
  getCustomerSessionCookieOptions,
} from "@/lib/auth/session-cookies";
import { validatePasswordStrength } from "@/lib/auth/password";
import { sdk } from "@/lib/medusa/client";

const CART_COOKIE = "_medusa_cart_id";
const EMAIL_CONFIRMATION_REQUIRED_MESSAGE =
  "Please confirm your email before signing in. We sent a new confirmation link.";
const EXISTING_IDENTITY_MESSAGE = "Identity with email already exists";
const EXISTING_CUSTOMER_ACCOUNT_MESSAGE =
  "An account already exists for this email. Please sign in instead.";
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Please enter a valid email address.");

type CustomerMetadata = Record<string, unknown> | null | undefined;

type CustomerWithMetadata = AuthUser & {
  metadata?: CustomerMetadata;
};

type CustomerAccountClaimResponse = {
  claimed?: boolean;
  linked?: boolean;
  already_registered?: boolean;
  customer?: CustomerWithMetadata;
};

function getAuthHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

function parseEmail(value: string) {
  const parsed = emailSchema.safeParse(value);

  if (!parsed.success) {
    return {
      success: false as const,
      error:
        parsed.error.issues[0]?.message ||
        "Please enter a valid email address.",
    };
  }

  return {
    success: true as const,
    email: parsed.data,
  };
}

function toAuthUser(customer: CustomerWithMetadata): AuthUser {
  const user: AuthUser = {
    id: customer.id,
    email: customer.email,
  };

  if (customer.first_name) {
    user.first_name = customer.first_name;
  }

  if (customer.last_name) {
    user.last_name = customer.last_name;
  }

  if (customer.phone) {
    user.phone = customer.phone;
  }

  return user;
}

function requiresEmailConfirmation(customer: CustomerWithMetadata) {
  const metadata = customer.metadata;

  if (!metadata || typeof metadata !== "object") {
    return false;
  }

  return (
    metadata.email_verification_status === "pending" &&
    typeof metadata.email_verified_at !== "string"
  );
}

function isExistingIdentityError(error: unknown) {
  const authError = error as { message?: string; statusText?: string };

  return (
    authError.statusText === "Unauthorized" &&
    authError.message === EXISTING_IDENTITY_MESSAGE
  );
}

async function getCustomerRegistrationToken(email: string, password: string) {
  try {
    return await sdk.auth.register("customer", "emailpass", {
      email,
      password,
    });
  } catch (error) {
    if (!isExistingIdentityError(error)) {
      throw error;
    }

    return await sdk.auth.login("customer", "emailpass", {
      email,
      password,
    });
  }
}

async function sendCustomerEmailVerification(token: string) {
  await sdk.client.fetch("/store/customers/email-verifications", {
    method: "POST",
    headers: getAuthHeaders(token),
  });
}

function getErrorStatus(error: unknown) {
  const maybeError = error as {
    status?: unknown;
    statusCode?: unknown;
    response?: { status?: unknown };
  };
  const status =
    maybeError.status || maybeError.statusCode || maybeError.response?.status;

  return typeof status === "number" ? status : null;
}

function isNoClaimableCustomerError(error: unknown) {
  return (
    getErrorStatus(error) === 404 ||
    (error instanceof Error &&
      error.message.includes("No existing customer is available to claim"))
  );
}

async function refreshCustomerToken(token: string) {
  const response = await sdk.client.fetch<{ token?: string }>(
    "/auth/token/refresh",
    {
      method: "POST",
      headers: getAuthHeaders(token),
    },
  );

  if (typeof response.token !== "string") {
    throw new Error("Failed to refresh customer token");
  }

  return response.token;
}

async function claimCustomerAccount({
  email,
  firstName,
  lastName,
  token,
}: {
  email: string;
  firstName?: string;
  lastName?: string;
  token: string;
}) {
  try {
    return await sdk.client.fetch<CustomerAccountClaimResponse>(
      "/store/customers/claim-account",
      {
        method: "POST",
        headers: getAuthHeaders(token),
        body: {
          email,
          first_name: firstName || "",
          last_name: lastName || "",
          source: "emailpass",
        },
      },
    );
  } catch (error) {
    if (isNoClaimableCustomerError(error)) {
      return null;
    }

    throw error;
  }
}

async function linkCustomerContextAfterLogin(token: string) {
  try {
    await sdk.client.fetch("/store/customers/me/link-guest-orders", {
      method: "POST",
      headers: getAuthHeaders(token),
    });
  } catch (error) {
    console.warn("Failed to link guest orders after login:", error);
  }

  try {
    const cookieStore = await cookies();
    const cartId = cookieStore.get(CART_COOKIE)?.value;

    if (!cartId) {
      return;
    }

    await sdk.client.fetch(`/store/carts/${cartId}/customer`, {
      method: "POST",
      headers: getAuthHeaders(token),
    });
  } catch (error) {
    console.warn("Failed to attach cart to customer after login:", error);
  }
}

export async function getCustomerAuthHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_TOKEN_COOKIE)?.value;

  return token ? getAuthHeaders(token) : null;
}

export interface AuthUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export async function loginAction(email: string, password: string) {
  try {
    // Attempt to authenticate with Medusa using emailpass provider
    const result = await sdk.auth.login("customer", "emailpass", {
      email,
      password,
    });

    // Check if additional steps required (e.g., OAuth redirect)
    if (typeof result !== "string") {
      return {
        success: false,
        error: "Authentication requires additional steps",
      };
    }

    const { customer } = await sdk.store.customer.retrieve(
      {},
      getAuthHeaders(result),
    );

    if (customer) {
      const authCustomer = customer as unknown as CustomerWithMetadata;

      if (requiresEmailConfirmation(authCustomer)) {
        await sendCustomerEmailVerification(result);
        return {
          success: false,
          error: EMAIL_CONFIRMATION_REQUIRED_MESSAGE,
          requiresEmailVerification: true,
        };
      }

      const cookieStore = await cookies();
      const sessionCookieOptions = getCustomerSessionCookieOptions();
      cookieStore.set(SESSION_COOKIE, "true", sessionCookieOptions);
      cookieStore.set(CUSTOMER_TOKEN_COOKIE, result, sessionCookieOptions);

      await linkCustomerContextAfterLogin(result);
      revalidatePath("/");
      return { success: true, user: toAuthUser(authCustomer) };
    }

    return { success: false, error: "Failed to retrieve customer data" };
  } catch (error: any) {
    console.error("Login error:", error);
    return { success: false, error: error.message || "Login failed" };
  }
}

export async function registerAction(
  email: string,
  password: string,
  firstName?: string,
  lastName?: string,
) {
  try {
    const passwordError = validatePasswordStrength(password);

    if (passwordError) {
      return {
        success: false,
        error: passwordError,
      };
    }

    // Register with Medusa auth, or reuse an existing identity token per Medusa's
    // documented customer-registration flow.
    const registrationToken = await getCustomerRegistrationToken(
      email,
      password,
    );

    if (typeof registrationToken !== "string") {
      return {
        success: false,
        error: "Registration requires additional steps",
      };
    }

    const claimedAccount = await claimCustomerAccount({
      email,
      firstName,
      lastName,
      token: registrationToken,
    });

    if (claimedAccount?.already_registered) {
      return {
        success: false,
        error: EXISTING_CUSTOMER_ACCOUNT_MESSAGE,
      };
    }

    let verificationToken = registrationToken;
    let customer = claimedAccount?.customer;

    if (claimedAccount?.linked) {
      verificationToken = await refreshCustomerToken(registrationToken);
    }

    if (!customer) {
      const response = await sdk.store.customer.create(
        {
          email,
          first_name: firstName || "",
          last_name: lastName || "",
        } as any,
        {},
        {
          Authorization: `Bearer ${registrationToken}`,
        },
      );
      customer = response.customer as unknown as CustomerWithMetadata;
    }

    if (!customer) {
      return { success: false, error: "Registration failed" };
    }

    await sendCustomerEmailVerification(verificationToken);

    return {
      success: true,
      requiresEmailVerification: true,
    };
  } catch (error: any) {
    console.error("Registration error:", error);
    return { success: false, error: error.message || "Registration failed" };
  }
}

export async function requestPasswordResetAction(email: string) {
  const parsedEmail = parseEmail(email);

  if (!parsedEmail.success) {
    return {
      success: false,
      error: parsedEmail.error,
    };
  }

  try {
    await sdk.auth.resetPassword("customer", "emailpass", {
      identifier: parsedEmail.email,
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Password reset request error:", error);
    return { success: true };
  }
}

export async function resetPasswordAction(
  email: string,
  token: string,
  password: string,
) {
  const parsedEmail = parseEmail(email);

  if (!parsedEmail.success) {
    return {
      success: false,
      error: parsedEmail.error,
    };
  }

  const resetToken = token.trim();

  if (!resetToken) {
    return {
      success: false,
      error: "Reset link is missing a token.",
    };
  }

  const passwordError = validatePasswordStrength(password);

  if (passwordError) {
    return {
      success: false,
      error: passwordError,
    };
  }

  try {
    await sdk.auth.updateProvider(
      "customer",
      "emailpass",
      {
        email: parsedEmail.email,
        password,
      },
      resetToken,
    );

    return { success: true };
  } catch (error: unknown) {
    console.error("Password reset error:", error);
    return {
      success: false,
      error:
        "Unable to reset password. Request a new reset link and try again.",
    };
  }
}

export async function getSessionAction() {
  try {
    const authHeaders = await getCustomerAuthHeaders();
    if (!authHeaders) {
      return { success: false, error: "No session" };
    }

    const { customer } = await sdk.store.customer.retrieve({}, authHeaders);

    if (customer) {
      const authCustomer = customer as unknown as CustomerWithMetadata;

      if (requiresEmailConfirmation(authCustomer)) {
        const cookieStore = await cookies();
        cookieStore.delete(SESSION_COOKIE);
        cookieStore.delete(CUSTOMER_TOKEN_COOKIE);

        return {
          success: false,
          error: "Email confirmation required",
          requiresEmailVerification: true,
        };
      }

      return { success: true, user: toAuthUser(authCustomer) };
    }

    return { success: false, error: "No session" };
  } catch (error: any) {
    return { success: false, error: error.message || "Session check failed" };
  }
}

export async function logoutAction() {
  try {
    await sdk.auth.logout();
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
    cookieStore.delete(CUSTOMER_TOKEN_COOKIE);
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Logout error:", error);
    return { success: false, error: error.message || "Logout failed" };
  }
}

export async function updateProfileAction(data: {
  first_name?: string;
  last_name?: string;
  phone?: string;
}) {
  try {
    const authHeaders = await getCustomerAuthHeaders();
    if (!authHeaders) {
      return { success: false, error: "No session" };
    }

    const { customer } = await sdk.store.customer.update(
      data as any,
      {},
      authHeaders,
    );
    revalidatePath("/account");
    return { success: true, user: customer as unknown as AuthUser };
  } catch (error: any) {
    console.error("Profile update error:", error);
    return { success: false, error: error.message || "Update failed" };
  }
}

export async function changePasswordAction(token: string, newPassword: string) {
  try {
    await sdk.auth.updateProvider(
      "customer",
      "emailpass",
      {
        password: newPassword,
      },
      token,
    );
    return { success: true };
  } catch (error: any) {
    console.error("Password change error:", error);
    return { success: false, error: error.message || "Password change failed" };
  }
}

export interface CustomerAddress {
  id: string;
  address_name?: string | null;
  first_name: string;
  last_name: string;
  company?: string | null;
  address_1: string;
  address_2?: string;
  city: string;
  province?: string;
  country_code: string;
  postal_code: string;
  phone?: string;
  is_default?: boolean;
  is_default_shipping?: boolean;
  is_default_billing?: boolean;
}

export async function getAddressesAction(): Promise<{
  success: boolean;
  addresses: CustomerAddress[];
  error?: string;
}> {
  try {
    const authHeaders = await getCustomerAuthHeaders();
    if (!authHeaders) {
      return { success: false, error: "No session", addresses: [] };
    }

    const { customer } = await sdk.store.customer.retrieve({}, authHeaders);
    if (customer?.addresses) {
      return {
        success: true,
        addresses: customer.addresses as unknown as CustomerAddress[],
      };
    }
    return { success: true, addresses: [] };
  } catch (error: any) {
    console.error("Get addresses error:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch addresses",
      addresses: [],
    };
  }
}

export async function addAddressAction(data: {
  address_name?: string;
  first_name: string;
  last_name: string;
  company?: string;
  address_1: string;
  address_2?: string;
  city: string;
  province?: string;
  country_code: string;
  postal_code: string;
  phone?: string;
}) {
  try {
    const authHeaders = await getCustomerAuthHeaders();
    if (!authHeaders) {
      return { success: false, error: "No session" };
    }

    const { customer } = await sdk.store.customer.createAddress(
      data as any,
      {},
      authHeaders,
    );
    revalidatePath("/account/addresses");
    return { success: true, customer };
  } catch (error: any) {
    console.error("Add address error:", error);
    return { success: false, error: error.message || "Failed to add address" };
  }
}

export async function updateAddressAction(
  addressId: string,
  data: Partial<{
    address_name: string;
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    province: string;
    country_code: string;
    postal_code: string;
    phone: string;
    is_default_shipping: boolean;
    is_default_billing: boolean;
  }>,
) {
  try {
    const authHeaders = await getCustomerAuthHeaders();
    if (!authHeaders) {
      return { success: false, error: "No session" };
    }

    const { customer } = await sdk.store.customer.updateAddress(
      addressId,
      data as any,
      {},
      authHeaders,
    );
    revalidatePath("/account/addresses");
    return { success: true, customer };
  } catch (error: any) {
    console.error("Update address error:", error);
    return {
      success: false,
      error: error.message || "Failed to update address",
    };
  }
}

export async function deleteAddressAction(addressId: string) {
  try {
    const authHeaders = await getCustomerAuthHeaders();
    if (!authHeaders) {
      return { success: false, error: "No session" };
    }

    await sdk.store.customer.deleteAddress(addressId, authHeaders);
    revalidatePath("/account/addresses");
    return { success: true };
  } catch (error: any) {
    console.error("Delete address error:", error);
    return {
      success: false,
      error: error.message || "Failed to delete address",
    };
  }
}

export async function setDefaultAddressAction(addressId: string) {
  try {
    const authHeaders = await getCustomerAuthHeaders();
    if (!authHeaders) {
      return { success: false, error: "No session" };
    }

    const { customer } = await sdk.store.customer.updateAddress(
      addressId,
      {
        is_default_shipping: true,
        is_default_billing: true,
      } as any,
      {},
      authHeaders,
    );
    revalidatePath("/account/addresses");
    return { success: true, customer };
  } catch (error: any) {
    console.error("Set default address error:", error);
    return {
      success: false,
      error: error.message || "Failed to set default address",
    };
  }
}

export async function deleteAccountAction() {
  try {
    const authHeaders = await getCustomerAuthHeaders();
    if (!authHeaders) {
      return { success: false, error: "No session" };
    }

    await sdk.client.fetch("/store/customers/me", {
      method: "DELETE",
      headers: authHeaders,
    });

    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
    cookieStore.delete(CUSTOMER_TOKEN_COOKIE);
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error: any) {
    console.error("Delete account error:", error);
    return {
      success: false,
      error: error.message || "Failed to delete account",
    };
  }
}
