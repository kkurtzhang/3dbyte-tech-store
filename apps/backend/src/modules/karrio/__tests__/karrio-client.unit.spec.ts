import { KarrioClient } from "../client";
import type { KarrioRateRequest, KarrioModuleOptions } from "../types";

const defaultOptions: KarrioModuleOptions = {
  apiUrl: "http://localhost:5002",
  apiKey: "test_key_123",
  testMode: true,
};

const mockRateRequest: KarrioRateRequest = {
  shipper: {
    person_name: "Test Store",
    address_line1: "123 Test St",
    city: "Sydney",
    postal_code: "2000",
    country_code: "AU",
  },
  recipient: {
    person_name: "John Doe",
    address_line1: "456 Customer Ave",
    city: "Melbourne",
    postal_code: "3000",
    country_code: "AU",
  },
  parcels: [
    {
      weight: 1.5,
      weight_unit: "KG",
      width: 20,
      height: 15,
      length: 30,
      dimension_unit: "CM",
    },
  ],
};

const mockRateResponse = {
  rates: [
    {
      id: "rate_1",
      carrier_id: "auspost",
      carrier_name: "Australia Post",
      service: "parcel_post",
      total_charge: 12.95,
      currency: "AUD",
      transit_days: 5,
      test_mode: true,
    },
    {
      id: "rate_2",
      carrier_id: "auspost",
      carrier_name: "Australia Post",
      service: "express_post",
      total_charge: 18.5,
      currency: "AUD",
      transit_days: 2,
      test_mode: true,
    },
  ],
};

describe("KarrioClient", () => {
  let client: KarrioClient;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    client = new KarrioClient(defaultOptions);
    fetchSpy = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe("fetchRates", () => {
    it("returns rates for a valid request", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRateResponse,
      });

      const result = await client.fetchRates(mockRateRequest);

      expect(result.rates).toHaveLength(2);
      expect(result.rates[0].carrier_name).toBe("Australia Post");
      expect(result.rates[0].total_charge).toBe(12.95);

      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:5002/v1/proxy/rates",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Token test_key_123",
          }),
        })
      );
    });

    it("throws on API error response", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => '{"error": "Invalid address"}',
      });

      await expect(client.fetchRates(mockRateRequest)).rejects.toThrow(
        "Karrio API error (400)"
      );
    });

    it("throws on timeout", async () => {
      fetchSpy.mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            const err = new DOMException("Aborted", "AbortError");
            setTimeout(() => reject(err), 10);
          })
      );

      await expect(client.fetchRates(mockRateRequest)).rejects.toThrow(
        "Karrio API request timed out"
      );
    });
  });

  describe("createShipment", () => {
    it("creates a shipment and returns tracking info", async () => {
      const mockShipment = {
        id: "shp_123",
        status: "purchased",
        tracking_number: "CP123456789AU",
        label_url: "https://karrio.test/labels/shp_123.pdf",
        carrier_name: "Australia Post",
        carrier_id: "auspost",
        service: "parcel_post",
        created_at: "2026-04-19T00:00:00Z",
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockShipment,
      });

      const result = await client.createShipment({
        ...mockRateRequest,
        service: "parcel_post",
      });

      expect(result.tracking_number).toBe("CP123456789AU");
      expect(result.label_url).toBe("https://karrio.test/labels/shp_123.pdf");
    });
  });

  describe("getTracking", () => {
    it("returns tracker details", async () => {
      const mockTracker = {
        id: "trk_123",
        tracking_number: "CP123456789AU",
        carrier_name: "Australia Post",
        carrier_id: "auspost",
        status: "in_transit",
        events: [
          {
            date: "2026-04-19T10:00:00Z",
            description: "Package accepted",
            location: "Sydney",
          },
        ],
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTracker,
      });

      const result = await client.getTracking("trk_123");

      expect(result.status).toBe("in_transit");
      expect(result.events).toHaveLength(1);
    });
  });

  describe("getCarriers", () => {
    it("returns active carriers", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              id: "car_1",
              carrier_id: "auspost",
              carrier_name: "Australia Post",
              display_name: "Australia Post",
              test_mode: true,
              active: true,
            },
          ],
        }),
      });

      const result = await client.getCarriers();

      expect(result).toHaveLength(1);
      expect(result[0].carrier_name).toBe("Australia Post");
    });
  });

  describe("cancelShipment", () => {
    it("cancels a shipment", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "shp_123",
          carrier_name: "Australia Post",
          carrier_id: "auspost",
          success: true,
        }),
      });

      const result = await client.cancelShipment("shp_123");

      expect(result.success).toBe(true);
    });
  });

  it("strips trailing slashes from API URL", () => {
    const clientWithSlash = new KarrioClient({
      ...defaultOptions,
      apiUrl: "http://localhost:5002///",
    });

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    });

    clientWithSlash.getCarriers();

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:5002/v1/carriers",
      expect.anything()
    );
  });
});
