import type { Logger } from "@medusajs/framework/types";

import KarrioFulfillmentService from "../service";

const logger = {
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
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
    jest.restoreAllMocks();
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
        payment: { paid_by: "sender" },
      }),
    );
    expect(result.calculated_amount).toBe(18.5);
  });

  it("does not silently convert Karrio calculation failures into free shipping", async () => {
    const service = new KarrioFulfillmentService({ logger }, defaultOptions);

    getClient(service).client.fetchRates = jest
      .fn()
      .mockRejectedValue(new Error("Karrio unavailable"));

    await expect(
      service.calculatePrice(
        {},
        {},
        {
          shipping_address: {
            address_1: "40 crown st",
            city: "Wollongong",
            country_code: "au",
            postal_code: "2500",
            province: "nsw",
          },
          items: [{ variant: { weight: 1 }, quantity: 1 }],
        } as never,
      ),
    ).rejects.toThrow("Karrio unavailable");
  });

  it("selects the requested Karrio service instead of always using the cheapest rate", async () => {
    const service = new KarrioFulfillmentService({ logger }, defaultOptions);

    getClient(service).client.fetchRates = jest.fn().mockResolvedValue({
      rates: [
        {
          id: "rat_economy",
          carrier_id: "aramex-au",
          carrier_name: "aramex_aunz",
          service: "aramex_aunz_economy",
          total_charge: 11.19,
          currency: "AUD",
          transit_days: 6,
          meta: { service_code: "E", service_name: "ECONOMY" },
          test_mode: false,
        },
        {
          id: "rat_priority",
          carrier_id: "aramex-au",
          carrier_name: "aramex_aunz",
          service: "aramex_aunz_priority",
          total_charge: 17.79,
          currency: "AUD",
          transit_days: 5,
          meta: { service_code: "P", service_name: "PRIORITY" },
          test_mode: false,
        },
      ],
    });

    await expect(
      service.calculatePrice(
        { carrier_id: "aramex-au", service_code: "P", name: "Karrio-Express" },
        {},
        {
          shipping_address: {
            address_1: "40 crown st",
            city: "Wollongong",
            country_code: "au",
            postal_code: "2500",
            province: "nsw",
          },
          items: [{ variant: { weight: 0.5 }, quantity: 1 }],
        } as never,
      ),
    ).resolves.toMatchObject({ calculated_amount: 17.79 });
  });

  it("prioritizes the selected live rate id saved on the cart shipping method", async () => {
    const service = new KarrioFulfillmentService({ logger }, defaultOptions);

    getClient(service).client.fetchRates = jest.fn().mockResolvedValue({
      rates: [
        {
          id: "rat_economy",
          carrier_id: "aramex-au",
          carrier_name: "aramex_aunz",
          service: "aramex_aunz_economy",
          total_charge: 11.19,
          currency: "AUD",
          transit_days: 6,
          meta: { service_code: "E", service_name: "ECONOMY" },
          test_mode: false,
        },
        {
          id: "rat_priority",
          carrier_id: "aramex-au",
          carrier_name: "aramex_aunz",
          service: "aramex_aunz_priority",
          total_charge: 17.79,
          currency: "AUD",
          transit_days: 5,
          meta: { service_code: "P", service_name: "PRIORITY" },
          test_mode: false,
        },
      ],
    });

    await expect(
      service.calculatePrice(
        { carrier_id: "aramex-au", service_code: "E", name: "Karrio-Standard" },
        { selected_rate_id: "rat_priority" },
        {
          shipping_address: {
            address_1: "40 crown st",
            city: "Wollongong",
            country_code: "au",
            postal_code: "2500",
            province: "nsw",
          },
          items: [{ variant: { weight: 0.5 }, quantity: 1 }],
        } as never,
      ),
    ).resolves.toMatchObject({ calculated_amount: 17.79 });
  });

  it("uses selected live carrier data when the admin shipping option was recreated with stale data", async () => {
    const service = new KarrioFulfillmentService({ logger }, defaultOptions);
    const fetchRates = jest.fn().mockResolvedValue({
      rates: [
        {
          id: "rat_priority",
          carrier_id: "aramex-au",
          carrier_name: "aramex_aunz",
          service: "aramex_aunz_priority",
          total_charge: 17.79,
          currency: "AUD",
          transit_days: 5,
          meta: { service_name: "PRIORITY" },
          test_mode: false,
        },
      ],
    });
    getClient(service).client.fetchRates = fetchRates;

    await expect(
      service.calculatePrice(
        {
          carrier_id: "old-aramex-connection",
          service: "old_aramex_standard",
          name: "Aramex Priority",
        },
        {
          carrier_id: "aramex-au",
          service: "aramex_aunz_priority",
          selected_rate_id: "rat_priority",
          service_name: "Aramex Priority",
        },
        {
          shipping_address: {
            address_1: "40 crown st",
            city: "Wollongong",
            country_code: "au",
            postal_code: "2500",
            province: "nsw",
          },
          items: [{ variant: { weight: 0.5 }, quantity: 1 }],
        } as never,
      ),
    ).resolves.toMatchObject({ calculated_amount: 17.79 });

    expect(fetchRates).toHaveBeenCalledWith(
      expect.objectContaining({
        carrier_ids: ["aramex-au"],
        services: ["aramex_aunz_priority"],
      }),
    );
  });
});
