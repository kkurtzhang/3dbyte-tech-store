let GET: typeof import("../route").GET;

describe("store active campaigns route", () => {
  beforeAll(() => {
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ({ GET } = require("../route"));
  });

  it("returns only campaigns active for the current storefront request", async () => {
    const listCampaigns = jest.fn().mockResolvedValue([
      {
        id: "camp_active",
        name: "Winter PETG Sale",
        campaign_identifier: "winter-petg-sale",
        description: "PETG deal window",
        starts_at: "2000-01-01T00:00:00.000Z",
        ends_at: "2999-01-01T00:00:00.000Z",
        promotions: [
          {
            id: "promo_1",
            code: "PETG10",
            status: "active",
          },
        ],
      },
      {
        id: "camp_future",
        name: "Future Sale",
        campaign_identifier: "future-sale",
        starts_at: "2999-01-01T00:00:00.000Z",
        ends_at: null,
        promotions: [],
      },
      {
        id: "camp_ended",
        name: "Ended Sale",
        campaign_identifier: "ended-sale",
        starts_at: "2000-01-01T00:00:00.000Z",
        ends_at: "2001-01-01T00:00:00.000Z",
        promotions: [],
      },
    ]);

    const req = {
      scope: {
        resolve: jest.fn(() => ({
          listCampaigns,
        })),
      },
    };
    const res = {
      json: jest.fn(),
    };

    await GET(req as never, res as never);

    expect(req.scope.resolve).toHaveBeenCalledWith("promotion");
    expect(listCampaigns).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        relations: ["promotions"],
      }),
    );
    expect(res.json).toHaveBeenCalledWith({
      campaigns: [
        expect.objectContaining({
          id: "camp_active",
          campaign_identifier: "winter-petg-sale",
          promotions: [
            expect.objectContaining({
              id: "promo_1",
              code: "PETG10",
            }),
          ],
        }),
      ],
    });
  });
});
