const mockAuthRegister = jest.fn();
const mockAuthLogin = jest.fn();
const mockAuthResetPassword = jest.fn();
const mockAuthUpdateProvider = jest.fn();
const mockClientFetch = jest.fn();
const mockCustomerCreate = jest.fn();
const mockCustomerRetrieve = jest.fn();
const mockCookieGet = jest.fn();
const mockCookieSet = jest.fn();
const mockCookieDelete = jest.fn();
const mockRevalidatePath = jest.fn();
const mockConsoleError = jest
  .spyOn(console, "error")
  .mockImplementation(() => undefined);

jest.mock("@/lib/medusa/client", () => ({
  sdk: {
    auth: {
      register: (...args: unknown[]) => mockAuthRegister(...args),
      login: (...args: unknown[]) => mockAuthLogin(...args),
      resetPassword: (...args: unknown[]) => mockAuthResetPassword(...args),
      updateProvider: (...args: unknown[]) => mockAuthUpdateProvider(...args),
    },
    client: {
      fetch: (...args: unknown[]) => mockClientFetch(...args),
    },
    store: {
      customer: {
        create: (...args: unknown[]) => mockCustomerCreate(...args),
        retrieve: (...args: unknown[]) => mockCustomerRetrieve(...args),
      },
    },
  },
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(async () => ({
    get: mockCookieGet,
    set: mockCookieSet,
    delete: mockCookieDelete,
  })),
}));

jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import {
  deleteAccountAction,
  getSessionAction,
  loginAction,
  registerAction,
  requestPasswordResetAction,
  resetPasswordAction,
} from "../auth";
import {
  disconnectGoogleLoginMethodAction,
  getAccountSecurityAction,
  getLoginMethodsAction,
  requestEmailChangeAction,
  setPasswordLoginMethodAction,
} from "../account-security";

describe("auth actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClientFetch.mockReset();
    mockAuthRegister.mockResolvedValue("registration-token");
    mockAuthResetPassword.mockResolvedValue(undefined);
    mockAuthUpdateProvider.mockResolvedValue(undefined);
    mockCustomerCreate.mockResolvedValue({
      customer: { id: "cus_123", email: "test@example.com" },
    });
    mockAuthLogin.mockResolvedValue("login-token");
    mockCustomerRetrieve.mockResolvedValue({
      customer: {
        id: "cus_123",
        email: "test@example.com",
        metadata: {
          email_verified_at: "2026-06-04T00:00:00.000Z",
        },
      },
    });
    mockClientFetch.mockResolvedValue({});
    mockCookieGet.mockImplementation((name: string) => {
      if (name === "_medusa_customer_token") {
        return { value: "stored-token" };
      }
      if (name === "_medusa_cart_id") {
        return { value: "cart_123" };
      }
      return undefined;
    });
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  it("uses the login token to retrieve and persist the customer session", async () => {
    await expect(
      loginAction("test@example.com", "Password123!"),
    ).resolves.toEqual({
      success: true,
      user: { id: "cus_123", email: "test@example.com", email_verified: true },
    });

    expect(mockCustomerRetrieve).toHaveBeenCalledWith(
      { fields: "*metadata" },
      {
        Authorization: "Bearer login-token",
      },
    );
    expect(mockCookieSet).toHaveBeenCalledWith(
      "_medusa_customer_token",
      "login-token",
      expect.objectContaining({ httpOnly: true }),
    );
    expect(mockClientFetch).toHaveBeenCalledWith(
      "/store/customers/me/link-guest-orders",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer login-token",
        },
      }),
    );
    expect(mockClientFetch).toHaveBeenCalledWith(
      "/store/carts/cart_123/customer",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer login-token",
        },
      }),
    );
  });

  it("uses the registration token to create a brand-new customer profile and sends verification", async () => {
    const noClaimableCustomer = new Error(
      "No existing customer is available to claim",
    );
    Object.assign(noClaimableCustomer, { status: 404 });
    mockClientFetch
      .mockRejectedValueOnce(noClaimableCustomer)
      .mockResolvedValueOnce({ token: "refreshed-token" })
      .mockResolvedValueOnce({});

    await expect(
      registerAction("test@example.com", "Password123!", "E2E", "Customer"),
    ).resolves.toEqual({
      success: true,
      requiresEmailVerification: true,
      user: { id: "cus_123", email: "test@example.com", email_verified: false },
    });

    expect(mockCustomerCreate).toHaveBeenCalledWith(
      {
        email: "test@example.com",
        first_name: "E2E",
        last_name: "Customer",
      },
      {},
      {
        Authorization: "Bearer registration-token",
      },
    );
    expect(mockClientFetch).toHaveBeenNthCalledWith(
      2,
      "/auth/token/refresh",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer registration-token",
        },
      }),
    );
    expect(mockClientFetch).toHaveBeenNthCalledWith(
      3,
      "/store/customers/email-verifications",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer refreshed-token",
        },
      }),
    );
    expect(mockAuthLogin).not.toHaveBeenCalled();
    expect(mockCookieSet).toHaveBeenCalled();
  });

  it("creates a registered profile while leaving same-email guest history separate", async () => {
    const noRegisteredCustomer = new Error(
      "No registered customer is available to link",
    );
    Object.assign(noRegisteredCustomer, { status: 404 });
    mockClientFetch
      .mockRejectedValueOnce(noRegisteredCustomer)
      .mockResolvedValueOnce({ token: "refreshed-token" })
      .mockResolvedValueOnce({});

    await expect(
      registerAction("guest@example.com", "Password123!", "Guest", "Customer"),
    ).resolves.toEqual({
      success: true,
      requiresEmailVerification: true,
      user: { id: "cus_123", email: "test@example.com", email_verified: false },
    });

    expect(mockClientFetch).toHaveBeenNthCalledWith(
      1,
      "/store/customers/claim-account",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer registration-token",
        },
        body: {
          email: "guest@example.com",
          first_name: "Guest",
          last_name: "Customer",
          source: "emailpass",
        },
      }),
    );
    expect(mockClientFetch).toHaveBeenNthCalledWith(
      2,
      "/auth/token/refresh",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer registration-token",
        },
      }),
    );
    expect(mockClientFetch).toHaveBeenNthCalledWith(
      3,
      "/store/customers/email-verifications",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer refreshed-token",
        },
      }),
    );
    expect(mockCustomerCreate).toHaveBeenCalledWith(
      {
        email: "guest@example.com",
        first_name: "Guest",
        last_name: "Customer",
      },
      {},
      {
        Authorization: "Bearer registration-token",
      },
    );
    expect(mockCookieSet).toHaveBeenCalled();
  });

  it("reuses an existing auth identity without a customer account before creating the customer profile", async () => {
    const existingIdentityError = new Error(
      "Identity with email already exists",
    );
    Object.assign(existingIdentityError, { statusText: "Unauthorized" });
    const noClaimableCustomer = new Error(
      "No existing customer is available to claim",
    );
    Object.assign(noClaimableCustomer, { status: 404 });
    mockAuthRegister.mockRejectedValueOnce(existingIdentityError);
    mockClientFetch
      .mockRejectedValueOnce(noClaimableCustomer)
      .mockResolvedValueOnce({ token: "refreshed-login-token" })
      .mockResolvedValueOnce({});

    await expect(
      registerAction("guest@example.com", "Password123!", "Guest", "Customer"),
    ).resolves.toEqual({
      success: true,
      requiresEmailVerification: true,
      user: { id: "cus_123", email: "test@example.com", email_verified: false },
    });

    expect(mockAuthLogin).toHaveBeenCalledWith("customer", "emailpass", {
      email: "guest@example.com",
      password: "Password123!",
    });
    expect(mockClientFetch).toHaveBeenNthCalledWith(
      1,
      "/store/customers/claim-account",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer login-token",
        },
        body: {
          email: "guest@example.com",
          first_name: "Guest",
          last_name: "Customer",
          source: "emailpass",
        },
      }),
    );
    expect(mockCustomerCreate).toHaveBeenCalledWith(
      {
        email: "guest@example.com",
        first_name: "Guest",
        last_name: "Customer",
      },
      {},
      {
        Authorization: "Bearer login-token",
      },
    );
    expect(mockClientFetch).toHaveBeenNthCalledWith(
      2,
      "/auth/token/refresh",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer login-token",
        },
      }),
    );
    expect(mockClientFetch).toHaveBeenNthCalledWith(
      3,
      "/store/customers/email-verifications",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer refreshed-login-token",
        },
      }),
    );
    expect(mockCookieSet).toHaveBeenCalled();
  });

  it("directs existing registered customers to sign in instead of creating another account", async () => {
    const existingIdentityError = new Error(
      "Identity with email already exists",
    );
    Object.assign(existingIdentityError, { statusText: "Unauthorized" });
    mockAuthRegister.mockRejectedValueOnce(existingIdentityError);
    mockClientFetch.mockResolvedValueOnce({
      already_registered: true,
      customer: {
        id: "cus_registered",
        email: "registered@example.com",
      },
    });

    await expect(
      registerAction(
        "registered@example.com",
        "Password123!",
        "Ava",
        "Customer",
      ),
    ).resolves.toEqual({
      success: false,
      error:
        "An account already exists for this email. Please sign in instead.",
    });

    expect(mockCustomerCreate).not.toHaveBeenCalled();
    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  it("returns a helpful registration message when an existing emailpass identity rejects the submitted password", async () => {
    const existingIdentityError = new Error(
      "Identity with email already exists",
    );
    Object.assign(existingIdentityError, { statusText: "Unauthorized" });
    const loginRejected = new Error("Unauthorized");
    Object.assign(loginRejected, { status: 401, statusText: "Unauthorized" });
    mockAuthRegister.mockRejectedValueOnce(existingIdentityError);
    mockAuthLogin.mockRejectedValueOnce(loginRejected);

    await expect(
      registerAction(
        "registered@example.com",
        "DifferentPassword123!",
        "Ava",
        "Customer",
      ),
    ).resolves.toEqual({
      success: false,
      error:
        "A sign-in already exists for this email. Please sign in or reset your password.",
    });

    expect(mockClientFetch).not.toHaveBeenCalledWith(
      "/store/customers/claim-account",
      expect.anything(),
    );
    expect(mockCustomerCreate).not.toHaveBeenCalled();
  });

  it("rejects weak registration passwords before calling Medusa", async () => {
    await expect(
      registerAction("test@example.com", "password", "E2E", "Customer"),
    ).resolves.toMatchObject({
      success: false,
      error: expect.stringContaining("uppercase"),
    });

    expect(mockAuthRegister).not.toHaveBeenCalled();
    expect(mockCustomerCreate).not.toHaveBeenCalled();
  });

  it("allows login for unverified customers but flags email_verified as false and resends verification", async () => {
    mockCustomerRetrieve.mockResolvedValueOnce({
      customer: {
        id: "cus_pending",
        email: "pending@example.com",
        metadata: {
          email_verification_status: "pending",
        },
      },
    });

    await expect(
      loginAction("pending@example.com", "Password123!"),
    ).resolves.toEqual({
      success: true,
      user: {
        id: "cus_pending",
        email: "pending@example.com",
        email_verified: false,
      },
    });

    expect(mockClientFetch).toHaveBeenCalledWith(
      "/store/customers/email-verifications",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer login-token",
        },
      }),
    );
    expect(mockCookieSet).toHaveBeenCalled();
    expect(mockClientFetch).not.toHaveBeenCalledWith(
      "/store/customers/me/link-guest-orders",
      expect.anything(),
    );
    expect(mockClientFetch).toHaveBeenCalledWith(
      "/store/carts/cart_123/customer",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer login-token",
        },
      }),
    );
  });

  it("requests customer metadata when checking the current session verification state", async () => {
    mockClientFetch.mockResolvedValueOnce({
      customer: {
        id: "cus_verified",
        email: "verified@example.com",
        metadata: {
          email_verification_status: "verified",
        },
      },
    });

    await expect(getSessionAction()).resolves.toEqual({
      success: true,
      user: {
        id: "cus_verified",
        email: "verified@example.com",
        email_verified: true,
      },
    });

    expect(mockClientFetch).toHaveBeenCalledWith(
      "/store/customers/me",
      expect.objectContaining({
        cache: "no-store",
        query: { fields: "*metadata" },
        headers: {
          Authorization: "Bearer stored-token",
        },
      }),
    );
  });

  it("retrieves the current session from the stored customer token", async () => {
    mockClientFetch.mockResolvedValueOnce({
      customer: {
        id: "cus_123",
        email: "test@example.com",
        metadata: {
          email_verified_at: "2026-06-04T00:00:00.000Z",
        },
      },
    });

    await expect(getSessionAction()).resolves.toEqual({
      success: true,
      user: { id: "cus_123", email: "test@example.com", email_verified: true },
    });

    expect(mockClientFetch).toHaveBeenCalledWith(
      "/store/customers/me",
      expect.objectContaining({
        cache: "no-store",
        query: { fields: "*metadata" },
        headers: {
          Authorization: "Bearer stored-token",
        },
      }),
    );
  });

  it("treats missing verification metadata as an unverified customer session", async () => {
    mockClientFetch.mockResolvedValueOnce({
      customer: {
        id: "cus_unknown",
        email: "unknown@example.com",
        metadata: null,
      },
    });

    await expect(getSessionAction()).resolves.toEqual({
      success: true,
      user: {
        id: "cus_unknown",
        email: "unknown@example.com",
        email_verified: false,
      },
    });
  });

  it("retrieves linked customer login methods from the backend", async () => {
    mockClientFetch.mockResolvedValueOnce({
      login_methods: {
        emailpass: true,
        google: true,
        providers: ["emailpass", "google"],
      },
    });

    await expect(getLoginMethodsAction()).resolves.toEqual({
      success: true,
      loginMethods: {
        emailpass: true,
        google: true,
        providers: ["emailpass", "google"],
      },
    });

    expect(mockClientFetch).toHaveBeenCalledWith(
      "/store/customers/me/login-methods",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer stored-token",
        },
      }),
    );
  });

  it("retrieves the sanitized account security summary", async () => {
    const accountSecurity = {
      customer_id: "cus_123",
      account_type: "registered",
      email: {
        value: "test@example.com",
        verification_status: "verified",
        verified_at: "2026-06-07T00:00:00.000Z",
      },
      providers: [
        {
          provider: "google",
          linked: true,
          linked_at: "2026-06-07T00:00:00.000Z",
        },
      ],
      consolidation: {
        status: "completed",
        transferred_order_count: 3,
        completed_at: "2026-06-07T00:01:00.000Z",
      },
      last_security_event: null,
      recent_security_events: [],
      warnings: [],
    };
    mockClientFetch.mockResolvedValueOnce({
      account_security: accountSecurity,
    });

    await expect(getAccountSecurityAction()).resolves.toEqual({
      success: true,
      accountSecurity,
    });

    expect(mockClientFetch).toHaveBeenCalledWith(
      "/store/customers/me/account-security",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer stored-token",
        },
      }),
    );
  });

  it("adds password login only with the recent Google reauthentication proof", async () => {
    mockCookieGet.mockImplementation((name: string) => {
      if (name === "_medusa_customer_token") {
        return { value: "stored-token" };
      }
      if (name === "customer_account_reauth") {
        return { value: "recent-google-proof" };
      }
      return undefined;
    });
    mockClientFetch.mockResolvedValueOnce({
      login_method: "emailpass",
      added: true,
    });

    await expect(
      setPasswordLoginMethodAction("StrongPassword123!"),
    ).resolves.toEqual({ success: true });

    expect(mockClientFetch).toHaveBeenCalledWith(
      "/store/customers/me/login-methods/emailpass",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer stored-token",
        },
        body: {
          password: "StrongPassword123!",
          reauth_token: "recent-google-proof",
        },
      }),
    );
    expect(mockCookieDelete).toHaveBeenCalledWith("customer_account_reauth");
  });

  it("disconnects Google only with the recent reauthentication proof", async () => {
    mockCookieGet.mockImplementation((name: string) => {
      if (name === "_medusa_customer_token") {
        return { value: "stored-token" };
      }
      if (name === "customer_account_reauth") {
        return { value: "recent-google-proof" };
      }
      return undefined;
    });
    mockClientFetch.mockResolvedValueOnce({
      login_method: "google",
      disconnected: true,
    });

    await expect(disconnectGoogleLoginMethodAction()).resolves.toEqual({
      success: true,
    });

    expect(mockClientFetch).toHaveBeenCalledWith(
      "/store/customers/me/login-methods/google",
      expect.objectContaining({
        method: "DELETE",
        headers: {
          Authorization: "Bearer stored-token",
          "x-customer-reauth-token": "recent-google-proof",
        },
      }),
    );
    expect(mockCookieDelete).toHaveBeenCalledWith("customer_account_reauth");
  });

  it("requires Google verification before a Google-only customer sets a password", async () => {
    await expect(
      setPasswordLoginMethodAction("StrongPassword123!"),
    ).resolves.toEqual({
      success: false,
      error: "Verify with Google again before setting a password.",
      requiresGoogleReauth: true,
    });

    expect(mockClientFetch).not.toHaveBeenCalledWith(
      "/store/customers/me/login-methods/emailpass",
      expect.anything(),
    );
  });

  it("requests a verified email change with the current password", async () => {
    mockClientFetch.mockResolvedValueOnce({
      sent: true,
      email: "new@example.com",
    });

    await expect(
      requestEmailChangeAction(" New@Example.COM ", "CurrentPassword123!"),
    ).resolves.toEqual({
      success: true,
      email: "new@example.com",
    });

    expect(mockClientFetch).toHaveBeenCalledWith(
      "/store/customers/me/email-change-requests",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer stored-token",
        },
        body: {
          email: "new@example.com",
          current_password: "CurrentPassword123!",
        },
      }),
    );
  });

  it("deletes the current customer account through the backend and clears session cookies", async () => {
    await expect(deleteAccountAction()).resolves.toEqual({ success: true });

    expect(mockClientFetch).toHaveBeenCalledWith(
      "/store/customers/me",
      expect.objectContaining({
        method: "DELETE",
        headers: {
          Authorization: "Bearer stored-token",
        },
      }),
    );
    expect(mockCookieDelete).toHaveBeenCalledWith("_medusa_authenticated");
    expect(mockCookieDelete).toHaveBeenCalledWith("_medusa_customer_token");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("requests a customer password reset without exposing account existence", async () => {
    await expect(
      requestPasswordResetAction(" Customer@Example.COM "),
    ).resolves.toEqual({
      success: true,
    });

    expect(mockAuthResetPassword).toHaveBeenCalledWith(
      "customer",
      "emailpass",
      {
        identifier: "customer@example.com",
      },
    );
  });

  it("rejects invalid password reset request emails before calling Medusa", async () => {
    await expect(requestPasswordResetAction("not-an-email")).resolves.toEqual({
      success: false,
      error: "Please enter a valid email address.",
    });

    expect(mockAuthResetPassword).not.toHaveBeenCalled();
  });

  it("keeps password reset request failures account-enumeration safe", async () => {
    mockAuthResetPassword.mockRejectedValueOnce(new Error("not found"));

    await expect(
      requestPasswordResetAction("customer@example.com"),
    ).resolves.toEqual({
      success: true,
    });

    expect(mockAuthResetPassword).toHaveBeenCalledWith(
      "customer",
      "emailpass",
      {
        identifier: "customer@example.com",
      },
    );
  });

  it("updates the customer password with the reset token and normalized email", async () => {
    await expect(
      resetPasswordAction(
        " Customer@Example.COM ",
        "reset-token",
        "Password123!",
      ),
    ).resolves.toEqual({
      success: true,
    });

    expect(mockAuthUpdateProvider).toHaveBeenCalledWith(
      "customer",
      "emailpass",
      {
        email: "customer@example.com",
        password: "Password123!",
      },
      "reset-token",
    );
  });

  it("rejects weak reset passwords before calling Medusa", async () => {
    await expect(
      resetPasswordAction("customer@example.com", "reset-token", "password"),
    ).resolves.toMatchObject({
      success: false,
      error: expect.stringContaining("uppercase"),
    });

    expect(mockAuthUpdateProvider).not.toHaveBeenCalled();
  });
});
