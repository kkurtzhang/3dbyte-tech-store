jest.mock("lucide-react", () => ({
  AlertCircle: () => null,
  ArrowRight: () => null,
  CheckCircle: () => null,
  CreditCard: () => null,
  MapPin: () => null,
  Package: () => null,
}))

jest.mock("@/app/actions/track-order", () => ({
  lookupOrder: jest.fn(),
}))

import { formatOrderTrackPrice } from "../page"

describe("formatOrderTrackPrice", () => {
  it("formats Medusa v2 major-unit order amounts without cents conversion", () => {
    expect(formatOrderTrackPrice(49.95, "aud")).toBe("A$49.95")
    expect(formatOrderTrackPrice(undefined, "aud")).toBe("A$0.00")
  })
})
