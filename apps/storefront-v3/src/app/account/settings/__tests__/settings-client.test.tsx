import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { deleteAccountAction } from "@/app/actions/auth";
import {
  disconnectGoogleLoginMethodAction,
  requestEmailChangeAction,
  setPasswordLoginMethodAction,
} from "@/app/actions/account-security";
import { navigateTo } from "@/lib/browser/navigation";
import { SettingsContent } from "../settings-client";

const mockPush = jest.fn();
const mockRefresh = jest.fn();
const mockSearchParams = jest.fn(() => new URLSearchParams());

jest.mock("@/app/actions/auth", () => ({
  changePasswordAction: jest.fn(),
  deleteAccountAction: jest.fn(),
  updateProfileAction: jest.fn(),
}));

jest.mock("@/app/actions/account-security", () => ({
  disconnectGoogleLoginMethodAction: jest.fn(),
  requestEmailChangeAction: jest.fn(),
  setPasswordLoginMethodAction: jest.fn(),
}));

jest.mock("@/lib/browser/navigation", () => ({
  navigateTo: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams(),
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

jest.mock(
  "lucide-react",
  () =>
    new Proxy(
      {},
      {
        get: (_target, prop) => {
          if (prop === "__esModule") return true;
          return (props: Record<string, unknown>) => <svg {...props} />;
        },
      },
    ),
);

const mockDeleteAccountAction = deleteAccountAction as jest.MockedFunction<
  typeof deleteAccountAction
>;
const mockDisconnectGoogleLoginMethodAction =
  disconnectGoogleLoginMethodAction as jest.MockedFunction<
    typeof disconnectGoogleLoginMethodAction
  >;
const mockSetPasswordLoginMethodAction =
  setPasswordLoginMethodAction as jest.MockedFunction<
    typeof setPasswordLoginMethodAction
  >;
const mockRequestEmailChangeAction =
  requestEmailChangeAction as jest.MockedFunction<
    typeof requestEmailChangeAction
  >;
const mockNavigateTo = navigateTo as jest.MockedFunction<typeof navigateTo>;

describe("SettingsContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.mockReturnValue(new URLSearchParams());
    mockDeleteAccountAction.mockResolvedValue({ success: true });
    mockDisconnectGoogleLoginMethodAction.mockResolvedValue({ success: true });
    mockSetPasswordLoginMethodAction.mockResolvedValue({ success: true });
    mockRequestEmailChangeAction.mockResolvedValue({
      success: true,
      email: "new@example.com",
    });
  });

  it("uses an Australian phone number placeholder", () => {
    render(
      <SettingsContent
        customer={{
          id: "cus_123",
          email: "kurt@example.com",
          first_name: "Kurt",
          last_name: "Zhang",
        }}
      />,
    );

    expect(screen.getByLabelText("Phone Number")).toHaveAttribute(
      "placeholder",
      "0400 000 000",
    );
  });

  it("shows a Google connect action when Google is not linked", () => {
    render(
      <SettingsContent
        customer={{
          id: "cus_123",
          email: "kurt@example.com",
          first_name: "Kurt",
          last_name: "Zhang",
        }}
        loginMethods={{
          emailpass: true,
          google: false,
          providers: ["emailpass"],
        }}
      />,
    );

    expect(screen.getByText("Login Methods")).toBeInTheDocument();
    expect(screen.getByText("Google")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /connect google/i }));

    expect(mockNavigateTo).toHaveBeenCalledWith(
      "/auth/google/start?mode=link&redirect=%2Faccount%2Fsettings",
    );
  });

  it("shows Google as connected without offering a duplicate connect action", () => {
    render(
      <SettingsContent
        customer={{
          id: "cus_123",
          email: "kurt@example.com",
          first_name: "Kurt",
          last_name: "Zhang",
        }}
        loginMethods={{
          emailpass: true,
          google: true,
          providers: ["emailpass", "google"],
        }}
      />,
    );

    expect(screen.getAllByText("Connected")).toHaveLength(2);
    expect(
      screen.queryByRole("button", { name: /connect google/i }),
    ).not.toBeInTheDocument();
  });

  it("shows consolidation and recent security activity from the sanitized summary", () => {
    render(
      <SettingsContent
        customer={{
          id: "cus_123",
          email: "kurt@example.com",
        }}
        loginMethods={{
          emailpass: true,
          google: true,
          providers: ["emailpass", "google"],
        }}
        accountSecurity={{
          customer_id: "cus_123",
          account_type: "registered",
          email: {
            value: "kurt@example.com",
            verification_status: "verified",
            verified_at: "2026-06-07T00:00:00.000Z",
          },
          providers: [],
          consolidation: {
            status: "completed",
            transferred_order_count: 3,
            completed_at: "2026-06-07T00:01:00.000Z",
          },
          last_security_event: {
            event_type: "login_method.google.linked",
            provider: "google",
            severity: "info",
            created_at: "2026-06-07T00:02:00.000Z",
          },
          recent_security_events: [
            {
              event_type: "login_method.google.linked",
              provider: "google",
              severity: "info",
              created_at: "2026-06-07T00:02:00.000Z",
            },
          ],
          warnings: [],
        }}
      />,
    );

    expect(screen.getByText("Verified email")).toBeInTheDocument();
    expect(
      screen.getByText("Account ready. We connected 3 previous orders."),
    ).toBeInTheDocument();
    expect(screen.getByText("Google login connected")).toBeInTheDocument();
  });

  it("guides a Google-only customer through reauthentication before setting a password", () => {
    render(
      <SettingsContent
        customer={{
          id: "cus_123",
          email: "kurt@example.com",
        }}
        loginMethods={{
          emailpass: false,
          google: true,
          providers: ["google"],
        }}
      />,
    );

    expect(
      screen.getByRole("button", { name: /verify with google/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /disconnect google/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Change Password")).not.toBeInTheDocument();
  });

  it("offers verified email change only when Google is disconnected", () => {
    render(
      <SettingsContent
        customer={{
          id: "cus_123",
          email: "kurt@example.com",
        }}
        loginMethods={{
          emailpass: true,
          google: false,
          providers: ["emailpass"],
        }}
      />,
    );

    expect(screen.getByText("Change account email")).toBeInTheDocument();
    expect(screen.getByLabelText("New email address")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Current password for email change"),
    ).toBeInTheDocument();
  });

  it("shows the confirmed email-change result after verification redirects", () => {
    mockSearchParams.mockReturnValue(new URLSearchParams("email=changed"));

    render(
      <SettingsContent
        customer={{
          id: "cus_123",
          email: "new@example.com",
        }}
        loginMethods={{
          emailpass: true,
          google: false,
          providers: ["emailpass"],
        }}
      />,
    );

    expect(
      screen.getByText("Your account email was updated successfully."),
    ).toBeInTheDocument();
  });

  it("allows Google disconnect only when password login remains", async () => {
    render(
      <SettingsContent
        customer={{
          id: "cus_123",
          email: "kurt@example.com",
        }}
        loginMethods={{
          emailpass: true,
          google: true,
          providers: ["emailpass", "google"],
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /verify with google/i }),
    );

    expect(mockNavigateTo).toHaveBeenCalledWith(
      "/auth/google/start?mode=link&redirect=%2Faccount%2Fsettings",
    );
  });

  it("refreshes the app shell after deleting the account so navigation shows signed-out state", async () => {
    render(
      <SettingsContent
        customer={{
          id: "cus_123",
          email: "kurt@example.com",
          first_name: "Kurt",
          last_name: "Zhang",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^delete account$/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /yes, delete my account/i }),
    );

    await waitFor(() => {
      expect(mockDeleteAccountAction).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/");
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});
