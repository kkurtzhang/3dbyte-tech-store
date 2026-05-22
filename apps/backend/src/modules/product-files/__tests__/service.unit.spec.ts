import ProductFilesModuleService from "../service";
import {
  ProductRegistrationSource,
  ProductRegistrationStatus,
} from "../models/product-registration";

function createService(overrides: Record<string, jest.Mock>) {
  return Object.assign(
    Object.create(ProductFilesModuleService.prototype),
    overrides,
  ) as ProductFilesModuleService & Record<string, jest.Mock>;
}

describe("ProductFilesModuleService serial entitlement rules", () => {
  it("claims an available serial for the authenticated customer immediately", async () => {
    const existingRegistration = {
      id: "preg_1",
      serial_number: "SN-001",
      medusa_product_id: "prod_1",
      customer_id: null,
      status: ProductRegistrationStatus.AVAILABLE,
    };
    const updateProductRegistrations = jest.fn().mockResolvedValue({
      ...existingRegistration,
      customer_id: "cus_1",
      status: ProductRegistrationStatus.CLAIMED,
      source: ProductRegistrationSource.CUSTOMER_CLAIMED,
    });
    const service = createService({
      listProductRegistrations: jest.fn().mockResolvedValue([
        existingRegistration,
      ]),
      updateProductRegistrations,
    });

    const registration = await service.claimProductSerial({
      serialNumber: " sn-001 ",
      medusaProductId: "prod_1",
      customerId: "cus_1",
    });

    expect(updateProductRegistrations).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "preg_1",
        serial_number: "SN-001",
        customer_id: "cus_1",
        status: ProductRegistrationStatus.CLAIMED,
        source: ProductRegistrationSource.CUSTOMER_CLAIMED,
      }),
    );
    expect(registration.customer_id).toBe("cus_1");
  });

  it("keeps a serial single-owner by rejecting a claim from another customer", async () => {
    const service = createService({
      listProductRegistrations: jest.fn().mockResolvedValue([
        {
          id: "preg_1",
          serial_number: "SN-001",
          medusa_product_id: "prod_1",
          customer_id: "cus_existing",
          status: ProductRegistrationStatus.CLAIMED,
        },
      ]),
      updateProductRegistrations: jest.fn(),
    });

    await expect(
      service.claimProductSerial({
        serialNumber: "SN-001",
        medusaProductId: "prod_1",
        customerId: "cus_2",
      }),
    ).rejects.toThrow("already claimed");
  });

  it("rejects revoked serials", async () => {
    const service = createService({
      listProductRegistrations: jest.fn().mockResolvedValue([
        {
          id: "preg_1",
          serial_number: "SN-001",
          medusa_product_id: "prod_1",
          customer_id: null,
          status: ProductRegistrationStatus.REVOKED,
        },
      ]),
      updateProductRegistrations: jest.fn(),
    });

    await expect(
      service.claimProductSerial({
        serialNumber: "SN-001",
        medusaProductId: "prod_1",
        customerId: "cus_1",
      }),
    ).rejects.toThrow("revoked");
  });

  it("lists active files for products registered to the customer", async () => {
    const service = createService({
      listProductRegistrations: jest.fn().mockResolvedValue([
        {
          id: "preg_1",
          medusa_product_id: "prod_1",
          serial_number: "SN-001",
          customer_id: "cus_1",
          status: ProductRegistrationStatus.CLAIMED,
        },
        {
          id: "preg_2",
          medusa_product_id: "prod_2",
          serial_number: "SN-002",
          customer_id: "cus_1",
          status: ProductRegistrationStatus.REVOKED,
        },
      ]),
      listProductEntitlementFiles: jest.fn().mockResolvedValue([
        {
          id: "pef_1",
          medusa_product_id: "prod_1",
          title: "Calibration Pack",
          document_type: "calibration_file",
          is_active: true,
        },
      ]),
    });

    await expect(service.listCustomerProductFiles("cus_1")).resolves.toEqual([
      expect.objectContaining({
        id: "pef_1",
        medusa_product_id: "prod_1",
        registration: expect.objectContaining({
          serial_number: "SN-001",
        }),
      }),
    ]);
  });
});
