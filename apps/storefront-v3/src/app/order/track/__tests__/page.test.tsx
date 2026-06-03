import { render, screen } from "@testing-library/react"

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

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => mockSearchParams,
}))

import TrackOrderPage, { formatOrderTrackPrice } from "../page"

let mockSearchParams = new URLSearchParams()

beforeEach(() => {
  mockSearchParams = new URLSearchParams()
})

describe("formatOrderTrackPrice", () => {
  it("formats Medusa v2 major-unit order amounts without cents conversion", () => {
    expect(formatOrderTrackPrice(49.95, "aud")).toBe("A$49.95")
    expect(formatOrderTrackPrice(undefined, "aud")).toBe("A$0.00")
  })

  it("prefills the order reference from the email tracking link", () => {
    mockSearchParams = new URLSearchParams({
      reference: "3DBO-AKK7-5KYYDE",
    })

    render(<TrackOrderPage />)

    expect(screen.getByLabelText("Order number or reference")).toHaveValue(
      "3DBO-AKK7-5KYYDE"
    )
    expect(screen.getByLabelText("Email Address")).toHaveValue("")
  })
})
