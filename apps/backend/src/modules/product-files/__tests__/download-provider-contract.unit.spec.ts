import { createRequire } from "node:module";
import ProductFilesModuleService from "../service";

jest.mock("@medusajs/framework/utils", () => ({
  ...jest.requireActual("@medusajs/framework/utils"),
  loadEnv: jest.fn(),
  defineConfig: (config: unknown) => config,
}));
type ProviderConfig = { resolve: string; options: Record<string, unknown> };
type ModuleConfig = { resolve: string; options?: { providers?: ProviderConfig[] } };
const now = Date.parse("2026-10-14T06:00:00Z");
const medusaRequire = createRequire(require.resolve("@medusajs/medusa/package.json"));
const s3Entry = medusaRequire.resolve("@medusajs/file-s3");
const signerPath = createRequire(s3Entry).resolve("@aws-sdk/s3-request-presigner");
const getSignedUrl = jest.fn(async (_client: unknown, _command: unknown, options: { expiresIn: number }) =>
  `https://files.example.invalid/fixture?X-Amz-Date=20261014T060000Z&X-Amz-Expires=${options.expiresIn}&X-Amz-Signature=offline-fixture`,
);
jest.doMock(signerPath, () => ({ getSignedUrl }));

beforeEach(() => { jest.spyOn(Date, "now").mockReturnValue(now); getSignedUrl.mockClear(); });
afterEach(() => jest.restoreAllMocks());

describe("installed Medusa S3 provider expiry contract", () => {
  it.each([undefined, 1800, 7200])("reports actual provider expiry with configured duration %s", async (configured) => {
    const config = require("../../../../medusa-config") as { modules: ModuleConfig[] };
    const original = config.modules.find((item) => item.resolve === "@medusajs/medusa/file")!
      .options!.providers!.find((item) => item.resolve === "@medusajs/medusa/file-s3")!.options;
    // Production policy remains absent/default3600. Alternative durations are fixture-only.
    expect(original).not.toHaveProperty("download_file_duration");
    const providerModule = require(s3Entry) as { default: { services: Array<new (
      container: { logger: object }, options: Record<string, unknown>
    ) => { getPresignedDownloadUrl(input: { fileKey: string }): Promise<string> }> } };
    const Provider = providerModule.default.services[0];
    const provider = new Provider({ logger: { error: jest.fn() } }, {
      ...original, access_key_id: "offline-fixture", secret_access_key: "offline-fixture",
      region: "us-east-1", bucket: "offline-fixture", endpoint: "https://storage.example.invalid",
      ...(configured === undefined ? {} : { download_file_duration: configured }),
    });
    const service = Object.assign(Object.create(ProductFilesModuleService.prototype), {
      listProductEntitlementFiles: jest.fn().mockResolvedValue([{
        id: "pef_fixture", medusa_product_id: "prod_fixture", file_key: "private/fixture.zip",
      }]),
      listProductRegistrations: jest.fn().mockResolvedValue([{ id: "registration_fixture" }]),
    }) as ProductFilesModuleService;
    const download = await service.createEntitledDownloadLink({
      fileId: "pef_fixture", customerId: "cus_fixture",
      retrieveFile: async (fileKey) => ({ url: await provider.getPresignedDownloadUrl({ fileKey }) }),
    });
    expect(getSignedUrl).toHaveBeenCalledTimes(1);
    expect(getSignedUrl.mock.calls[0][2].expiresIn).toBe(configured ?? 3600);
    expect(download.expires_in).toBe(getSignedUrl.mock.calls[0][2].expiresIn);
    expect(download.url).toContain(`X-Amz-Expires=${download.expires_in}`);
  });
});
