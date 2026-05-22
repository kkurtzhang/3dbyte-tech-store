import { POST } from "../route";

describe("POST /store/customers/me/product-registrations", () => {
  it("requires an authenticated customer", async () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();

    await POST(
      {
        auth_context: undefined,
        body: {
          serial_number: "SN-001",
          medusa_product_id: "prod_1",
        },
      } as never,
      { status, json } as never,
    );

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: "Unauthorized" });
  });

  it("claims the serial through the product files module", async () => {
    const claimProductSerial = jest.fn().mockResolvedValue({
      id: "preg_1",
      serial_number: "SN-001",
      medusa_product_id: "prod_1",
      customer_id: "cus_1",
    });
    const json = jest.fn();

    await POST(
      {
        auth_context: { actor_id: "cus_1" },
        body: {
          serial_number: "SN-001",
          medusa_product_id: "prod_1",
        },
        scope: {
          resolve: jest.fn().mockReturnValue({ claimProductSerial }),
        },
      } as never,
      { status: jest.fn().mockReturnThis(), json } as never,
    );

    expect(claimProductSerial).toHaveBeenCalledWith({
      serialNumber: "SN-001",
      medusaProductId: "prod_1",
      customerId: "cus_1",
      orderId: undefined,
    });
    expect(json).toHaveBeenCalledWith({
      registration: expect.objectContaining({
        id: "preg_1",
      }),
    });
  });
});
