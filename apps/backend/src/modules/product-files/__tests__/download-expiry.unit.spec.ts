import ProductFilesModuleService from "../service";
import { ProductRegistrationStatus } from "../models/product-registration";

const now = Date.parse("2026-10-14T06:00:00Z");
const input = { fileId: "pef_fixture", customerId: "cus_fixture" };
const file = { id: input.fileId, medusa_product_id: "prod_fixture", file_key: "private/fixture.zip" };
function signedUrl(expires = "3600", date = "20261014T060000Z") {
  return `https://files.example.invalid/fixture?X-Amz-Date=${date}&X-Amz-Expires=${expires}&X-Amz-Signature=offline-fixture`;
}
function setup() {
  const listProductEntitlementFiles = jest.fn().mockResolvedValue([file]);
  const listProductRegistrations = jest.fn().mockResolvedValue([{ id: "registration_fixture" }]);
  const service = Object.assign(Object.create(ProductFilesModuleService.prototype), {
    listProductEntitlementFiles, listProductRegistrations,
  }) as ProductFilesModuleService;
  return { service, listProductEntitlementFiles, listProductRegistrations };
}
beforeEach(() => jest.spyOn(Date, "now").mockReturnValue(now));
afterEach(() => jest.restoreAllMocks());

describe("entitled download expiry from returned S3 signing metadata", () => {
  it.each([3600, 1800, 7200])("reports the returned %i-second signing policy", async (ttl) => {
    const { service } = setup();
    const url = signedUrl(String(ttl));
    await expect(service.createEntitledDownloadLink({
      ...input, retrieveFile: jest.fn().mockResolvedValue({ url }),
    })).resolves.toEqual({ url, expires_in: ttl });
  });
  it("subtracts elapsed time and rounds down, without rewriting the signed URL", async () => {
    jest.spyOn(Date, "now").mockReturnValue(now + 60_250);
    const { service } = setup();
    const url = signedUrl();
    await expect(service.createEntitledDownloadLink({
      ...input, retrieveFile: jest.fn().mockResolvedValue({ url }),
    })).resolves.toEqual({ url, expires_in: 3539 });
  });
  it.each([
    undefined, null, {}, { url: undefined }, { url: null }, { url: 12 }, { url: "" }, { url: "  " },
    { url: "private/fixture.zip" }, { url: "https://files.example.invalid/unsigned" },
    { url: signedUrl("0") }, { url: signedUrl("-1") }, { url: signedUrl("1.5") },
    { url: signedUrl("Infinity") }, { url: signedUrl("1e3") }, { url: signedUrl("604801") },
    { url: signedUrl("3600", "invalid") }, { url: signedUrl("3600", "20260230T060000Z") },
    { url: signedUrl("3600", "20261014T050000Z") }, { url: signedUrl("3600", "20261015T060000Z") },
    { url: signedUrl() + "&X-Amz-Expires=7200" }, { url: signedUrl() + "&X-Amz-Date=20261014T060000Z" },
  ])("rejects missing or unusable signing metadata: %j", async (result) => {
    const { service } = setup();
    await expect(service.createEntitledDownloadLink({
      ...input, retrieveFile: jest.fn().mockResolvedValue(result),
    })).rejects.toThrow("Unable to create a product file download link");
  });
  it("rejects a missing retrieval adapter", async () => {
    const { service } = setup();
    await expect(service.createEntitledDownloadLink(input)).rejects.toThrow("Unable to create a product file download link");
  });
  it("preserves provider errors without returning the file key", async () => {
    const { service } = setup();
    await expect(service.createEntitledDownloadLink({
      ...input, retrieveFile: jest.fn().mockRejectedValue(new Error("provider unavailable")),
    })).rejects.toThrow("provider unavailable");
  });
  it("retains active file and exact claimed customer/product checks", async () => {
    const { service, listProductEntitlementFiles, listProductRegistrations } = setup();
    const retrieveFile = jest.fn().mockResolvedValue({ url: signedUrl() });
    await service.createEntitledDownloadLink({ ...input, retrieveFile });
    expect(listProductEntitlementFiles).toHaveBeenCalledWith({ id: input.fileId, is_active: true });
    expect(listProductRegistrations).toHaveBeenCalledWith({
      customer_id: input.customerId, medusa_product_id: file.medusa_product_id,
      status: ProductRegistrationStatus.CLAIMED,
    });
    expect(retrieveFile).toHaveBeenCalledWith(file.file_key);
  });
  it("does not request a URL for a missing/inactive file", async () => {
    const { service, listProductEntitlementFiles, listProductRegistrations } = setup();
    listProductEntitlementFiles.mockResolvedValue([]);
    const retrieveFile = jest.fn();
    await expect(service.createEntitledDownloadLink({ ...input, retrieveFile })).rejects.toThrow("not found");
    expect(listProductRegistrations).not.toHaveBeenCalled();
    expect(retrieveFile).not.toHaveBeenCalled();
  });
  it("does not request a URL without the required entitlement", async () => {
    const { service, listProductRegistrations } = setup();
    listProductRegistrations.mockResolvedValue([]);
    const retrieveFile = jest.fn();
    await expect(service.createEntitledDownloadLink({ ...input, retrieveFile })).rejects.toThrow("not entitled");
    expect(retrieveFile).not.toHaveBeenCalled();
  });
});
