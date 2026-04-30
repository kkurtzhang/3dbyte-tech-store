import {
  buildParcelsFromItems,
  buildRecipientAddress,
  buildShipperAddress,
} from "../utils";

describe("Karrio payload utilities", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      STORE_SHIPPER_NAME: "Australia Warehouse",
      STORE_SHIPPER_ADDRESS: "1 Bellevue Parade",
      STORE_SHIPPER_CITY: "New Town",
      STORE_SHIPPER_STATE: "tas",
      STORE_SHIPPER_POSTAL: "7008",
      STORE_SHIPPER_COUNTRY: "au",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("normalizes Karrio address country and state codes to uppercase", () => {
    expect(buildShipperAddress()).toEqual(
      expect.objectContaining({
        country_code: "AU",
        state_code: "TAS",
      })
    );

    expect(
      buildRecipientAddress({
        address_1: "40 crown st",
        city: "Wollongong",
        country_code: "au",
        postal_code: "2500",
        province: "nsw",
      })
    ).toEqual(
      expect.objectContaining({
        country_code: "AU",
        state_code: "NSW",
      })
    );
  });

  it("uses the configured warehouse fallback when shipper env fields are missing", () => {
    process.env = { ...originalEnv };

    expect(buildShipperAddress()).toEqual(
      expect.objectContaining({
        address_line1: "1 Bellevue Parade",
        city: "New Town",
        company_name: "3D BYTE TECH",
        country_code: "AU",
        person_name: "Kurt",
        postal_code: "7008",
        residential: false,
        state_code: "TAS",
      })
    );
  });

  it("builds Karrio parcel payload fields expected by the rates API", () => {
    expect(buildParcelsFromItems([{ variant: { weight: 1 }, quantity: 1 }])).toEqual([
      expect.objectContaining({
        dimension_unit: "CM",
        height: expect.any(Number),
        is_document: false,
        length: expect.any(Number),
        packaging_type: "your_packaging",
        weight: 1,
        weight_unit: "KG",
        width: expect.any(Number),
      }),
    ]);
  });
});
