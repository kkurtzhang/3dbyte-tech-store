const mockWorkflowRun = jest.fn();

jest.mock("@medusajs/medusa/core-flows", () => ({
  removeCustomerAccountWorkflow: jest.fn(),
}));

import { removeCustomerAccountWorkflow } from "@medusajs/medusa/core-flows";
import { DELETE } from "../route";

const mockRemoveCustomerAccountWorkflow =
  removeCustomerAccountWorkflow as jest.MockedFunction<
    typeof removeCustomerAccountWorkflow
  >;

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe("DELETE /store/customers/me", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRemoveCustomerAccountWorkflow.mockReturnValue({
      run: mockWorkflowRun,
    } as never);
    mockWorkflowRun.mockResolvedValue({ result: { id: "cus_123" } });
  });

  it("requires a logged-in customer", async () => {
    const res = createResponse();

    await DELETE({ auth_context: undefined } as never, res as never);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    expect(mockRemoveCustomerAccountWorkflow).not.toHaveBeenCalled();
  });

  it("removes the current customer account with Medusa's account-removal workflow", async () => {
    const scope = { resolve: jest.fn() };
    const res = createResponse();

    await DELETE(
      {
        auth_context: { actor_id: "cus_123" },
        scope,
      } as never,
      res as never,
    );

    expect(mockRemoveCustomerAccountWorkflow).toHaveBeenCalledWith(scope);
    expect(mockWorkflowRun).toHaveBeenCalledWith({
      input: {
        customerId: "cus_123",
      },
    });
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});
