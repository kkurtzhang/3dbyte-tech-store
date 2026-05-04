import { getShippingServiceDisplayName } from "../display-name"

describe("getShippingServiceDisplayName", () => {
  it("maps internal Karrio option names to customer-facing Aramex services", () => {
    expect(
      getShippingServiceDisplayName({
        description: "Economy",
        name: "Karrio-Standard",
      })
    ).toBe("Aramex Economy")

    expect(
      getShippingServiceDisplayName({
        description: "Priority",
        name: "Karrio-Express",
      })
    ).toBe("Aramex Priority")
  })

  it("maps raw Karrio service names to Aramex services", () => {
    expect(
      getShippingServiceDisplayName({
        carrierName: "aramex_aunz",
        service: "aramex_aunz_economy",
        serviceName: "ECONOMY",
      })
    ).toBe("Aramex Economy")
  })
})
