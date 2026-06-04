import { KARRIO_MODULE } from "../../../../modules/karrio";
import { hasRequiredRateAddress, POST } from "../route";

describe("store shipping-rates route helpers", () => {
  it("requires city, postal code, and country before calling Karrio", () => {
    expect(
      hasRequiredRateAddress({
        city: "Wollongong",
        country_code: "AU",
        postal_code: "2500",
      })
    ).toBe(true);

    expect(
      hasRequiredRateAddress({
        city: "Wollongong",
        country_code: "AU",
      })
    ).toBe(false);

    expect(
      hasRequiredRateAddress({
        country_code: "AU",
        postal_code: "2500",
      })
    ).toBe(false);
  });

  it("maps Karrio Aramex rates even when Karrio omits the service field", async () => {
    const graph = jest.fn().mockResolvedValue({
      data: [
        {
          id: "cart_1",
          items: [
            {
              quantity: 1,
              variant: {
                weight: 1.3,
                length: 20,
                width: 20,
                height: 20,
              },
            },
          ],
          shipping_address: null,
        },
      ],
    });
    const fetchRates = jest.fn().mockResolvedValue({
      rates: [
        {
          id: "rat_economy",
          carrier_name: "aramex_aunz",
          carrier_id: "Aramex",
          currency: "AUD",
          total_charge: 12.5,
          extra_charges: [
            {
              name: "PKG-1: Parcel of 1.30kg dead",
              amount: 10.57,
              currency: "AUD",
            },
          ],
          meta: {
            carrier: "aramex_aunz",
          },
          test_mode: true,
        },
        {
          id: "rat_priority",
          carrier_name: "aramex_aunz",
          carrier_id: "Aramex",
          currency: "AUD",
          total_charge: 19.1,
          extra_charges: [
            {
              name: "Priority Delivery Service",
              amount: 6.6,
              currency: "AUD",
            },
          ],
          meta: {
            carrier: "aramex_aunz",
          },
          test_mode: true,
        },
      ],
    });
    const req = {
      body: {
        cart_id: "cart_1",
        shipping_address: {
          city: "Barangaroo",
          country_code: "AU",
          postal_code: "2000",
          province: "NSW",
        },
      },
      scope: {
        resolve: jest.fn((key: string) => {
          if (key === "query") {
            return { graph };
          }

          if (key === KARRIO_MODULE) {
            return { fetchRates };
          }

          throw new Error(`Unexpected dependency: ${key}`);
        }),
      },
    };
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await POST(req as never, res as never);

    expect(fetchRates).toHaveBeenCalledWith(
      expect.objectContaining({
        payment: { paid_by: "sender" },
      })
    );
    expect(res.json).toHaveBeenCalledWith({
      rates: [
        expect.objectContaining({
          id: "rat_economy",
          service: "aramex_aunz",
          serviceName: "Aramex Economy",
          totalCharge: 1250,
        }),
        expect.objectContaining({
          id: "rat_priority",
          service: "aramex_aunz_priority",
          serviceName: "Aramex Priority",
          totalCharge: 1910,
        }),
      ],
    });
  });

  it("returns Karrio carrier messages without failing the live-rate endpoint", async () => {
    const graph = jest.fn().mockResolvedValue({
      data: [
        {
          id: "cart_1",
          items: [{ quantity: 1, variant: { weight: 0.5 } }],
          shipping_address: null,
        },
      ],
    });
    const fetchRates = jest.fn().mockResolvedValue({
      rates: [],
      messages: [
        {
          carrier_id: "Aramex",
          carrier_name: "aramex_aunz",
          code: "SHIPPING_SDK_INTERNAL_ERROR",
          message: "'NoneType' object has no attribute 'sLACode'",
        },
      ],
    });
    const req = {
      body: {
        cart_id: "cart_1",
        shipping_address: {
          city: "Bickley",
          country_code: "AU",
          postal_code: "6076",
          province: "WA",
        },
      },
      scope: {
        resolve: jest.fn((key: string) => {
          if (key === "query") {
            return { graph };
          }

          if (key === KARRIO_MODULE) {
            return { fetchRates };
          }

          throw new Error(`Unexpected dependency: ${key}`);
        }),
      },
    };
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await POST(req as never, res as never);

    expect(fetchRates).toHaveBeenCalledWith(
      expect.objectContaining({
        payment: { paid_by: "sender" },
      })
    );
    expect(res.json).toHaveBeenCalledWith({
      rates: [],
      messages: [
        {
          carrier_id: "Aramex",
          carrier_name: "aramex_aunz",
          code: "SHIPPING_SDK_INTERNAL_ERROR",
          message: "'NoneType' object has no attribute 'sLACode'",
        },
      ],
    });
    expect(res.status).not.toHaveBeenCalled();
  });
});
