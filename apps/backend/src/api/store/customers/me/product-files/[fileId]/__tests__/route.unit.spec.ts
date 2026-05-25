import { POST } from "../download/route";

describe("POST /store/customers/me/product-files/:fileId/download", () => {
  it("requires an authenticated customer", async () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();

    await POST(
      {
        auth_context: undefined,
        params: { fileId: "pef_1" },
      } as never,
      { status, json } as never,
    );

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: "Unauthorized" });
  });

  it("returns a download URL only after the service rechecks entitlement", async () => {
    const createEntitledDownloadLink = jest.fn().mockResolvedValue({
      url: "https://signed.example.com/calibration.zip",
      expires_in: 900,
    });
    const json = jest.fn();

    const resolve = jest
      .fn()
      .mockReturnValueOnce({ createEntitledDownloadLink })
      .mockReturnValueOnce({ retrieveFile: jest.fn() });

    await POST(
      {
        auth_context: { actor_id: "cus_1" },
        params: { fileId: "pef_1" },
        scope: {
          resolve,
        },
      } as never,
      { status: jest.fn().mockReturnThis(), json } as never,
    );

    expect(createEntitledDownloadLink).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: "pef_1",
        customerId: "cus_1",
        retrieveFile: expect.any(Function),
      }),
    );
    expect(json).toHaveBeenCalledWith({
      download: {
        url: "https://signed.example.com/calibration.zip",
        expires_in: 900,
      },
    });
  });
});
