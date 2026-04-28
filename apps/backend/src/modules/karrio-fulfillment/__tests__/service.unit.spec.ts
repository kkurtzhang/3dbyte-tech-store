import type { Logger } from "@medusajs/framework/types";

import KarrioFulfillmentService from "../service";

const logger = {
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger;

const defaultOptions = {
  apiUrl: "http://localhost:5002",
  apiKey: "test_key_123",
  testMode: true,
};

function getClient(service: KarrioFulfillmentService) {
  return service as unknown as {
    client: {
      getCarriers: jest.Mock;
      fetchRates: jest.Mock;
      createShipment: jest.Mock;
    };
  };
}

describe("KarrioFulfillmentService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns configured carrier-service fulfillment options when carriers are unavailable", async () => {
    const service = new KarrioFulfillmentService({ logger }, defaultOptions);
    getClient(service).client.getCarriers = jest
      .fn()
      .mockRejectedValue(new Error("offline"));

    const options = await service.getFulfillmentOptions();

    expect(options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Australia Post Standard",
          carrier_id: "australiapost",
          service: "australiapost_parcel_post",
        }),
        expect.objectContaining({
          name: "Aramex Priority",
          carrier_id: "aramex",
          service: "aramex_priority",
        }),
      ]),
    );
  });

  it("filters configured options to active Karrio carriers", async () => {
    const service = new KarrioFulfillmentService({ logger }, defaultOptions);
    getClient(service).client.getCarriers = jest.fn().mockResolvedValue([
      {
        carrier_id: "australiapost",
        carrier_name: "Australia Post",
        display_name: "Australia Post",
        active: true,
      },
      {
        carrier_id: "aramex",
        carrier_name: "Aramex",
        display_name: "Aramex",
        active: false,
      },
    ]);

    const options = await service.getFulfillmentOptions();

    expect(options.map((option) => option.id)).toEqual([
      "australiapost-parcel-post",
      "australiapost-express-post",
    ]);
  });

  it("passes selected carrier and service to Karrio when calculating prices", async () => {
    const service = new KarrioFulfillmentService({ logger }, defaultOptions);
    const fetchRates = jest.fn().mockResolvedValue({
      rates: [
        {
          id: "rate_1",
          carrier_id: "australiapost",
          carrier_name: "Australia Post",
          service: "australiapost_express_post",
          total_charge: 18.5,
          currency: "AUD",
        },
      ],
    });
    getClient(service).client.fetchRates = fetchRates;

    const result = await service.calculatePrice(
      {
        carrier_id: "australiapost",
        service: "australiapost_express_post",
      },
      {},
      {
        shipping_address: {
          first_name: "Ada",
          last_name: "Lovelace",
          address_1: "1 Test Street",
          city: "Hobart",
          postal_code: "7000",
          country_code: "AU",
        },
        items: [{ quantity: 2, variant: { weight: 1 } }],
      },
    );

    expect(fetchRates).toHaveBeenCalledWith(
      expect.objectContaining({
        carrier_ids: ["australiapost"],
        services: ["australiapost_express_post"],
      }),
    );
    expect(result.calculated_amount).toBe(1850);
  });
});
