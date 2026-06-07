import { consolidateGuestHistory } from "../../../../../../modules/account-coordination/consolidate-guest-history";
import { POST } from "../route";

jest.mock(
  "../../../../../../modules/account-coordination/consolidate-guest-history",
  () => ({
    consolidateGuestHistory: jest.fn(),
  }),
);

const mockConsolidateGuestHistory =
  consolidateGuestHistory as jest.MockedFunction<
    typeof consolidateGuestHistory
  >;

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe("POST /store/customers/me/link-guest-orders", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requires an authenticated registered customer", async () => {
    const res = createResponse();

    await POST({ auth_context: undefined } as never, res as never);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
  });

  it("delegates to the rollout-controlled guest-history coordinator", async () => {
    mockConsolidateGuestHistory.mockResolvedValue({
      mode: "dry_run",
      status: "completed",
      run_id: "gcr_123",
      transferred_order_ids: ["order_guest"],
      attached_cart_ids: ["cart_guest"],
      attached_support_ticket_ids: [],
      skipped_items: [],
      profile_fields_filled: ["first_name"],
    });
    const scope = { resolve: jest.fn() };
    const req = {
      auth_context: { actor_id: "cus_123" },
      scope,
    };
    const res = createResponse();

    await POST(req as never, res as never);

    expect(mockConsolidateGuestHistory).toHaveBeenCalledWith({
      container: scope,
      customerId: "cus_123",
    });
    expect(res.json).toHaveBeenCalledWith({
      consolidation: expect.objectContaining({
        mode: "dry_run",
        status: "completed",
        transferred_order_ids: ["order_guest"],
      }),
      linked: 1,
    });
  });
});
