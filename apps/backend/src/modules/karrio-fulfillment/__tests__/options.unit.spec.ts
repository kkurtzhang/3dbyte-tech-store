import { getConfiguredKarrioFulfillmentOptions } from "../options";

describe("getConfiguredKarrioFulfillmentOptions", () => {
  it("returns default AU/NZ carrier-service options", () => {
    const options = getConfiguredKarrioFulfillmentOptions("");

    expect(options).toEqual([
      expect.objectContaining({
        id: "australiapost-parcel-post",
        name: "Australia Post Standard",
        carrier_id: "australiapost",
        service: "australiapost_parcel_post",
      }),
      expect.objectContaining({
        id: "australiapost-express-post",
        name: "Australia Post Express",
        carrier_id: "australiapost",
        service: "australiapost_express_post",
      }),
      expect.objectContaining({
        id: "aramex-economy",
        name: "Aramex Economy",
        carrier_id: "aramex",
        service: "aramex_economy",
      }),
      expect.objectContaining({
        id: "aramex-priority",
        name: "Aramex Priority",
        carrier_id: "aramex",
        service: "aramex_priority",
      }),
    ]);
  });

  it("uses a valid JSON override", () => {
    const options = getConfiguredKarrioFulfillmentOptions(
      JSON.stringify([
        {
          id: "custom-option",
          name: "Custom Carrier Overnight",
          carrier_id: "custom",
          carrier_name: "Custom Carrier",
          service: "custom_overnight",
          service_name: "Overnight",
        },
      ]),
    );

    expect(options).toEqual([
      {
        id: "custom-option",
        name: "Custom Carrier Overnight",
        carrier_id: "custom",
        carrier_name: "Custom Carrier",
        service: "custom_overnight",
        service_name: "Overnight",
      },
    ]);
  });

  it("falls back to defaults for invalid JSON overrides", () => {
    const options = getConfiguredKarrioFulfillmentOptions("{bad json");

    expect(options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "australiapost-parcel-post" }),
      ]),
    );
  });
});
