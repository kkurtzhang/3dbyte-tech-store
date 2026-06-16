import { act, render, screen } from "@testing-library/react"

import { OfflineStatusBanner } from "../offline-status-banner"

jest.mock("lucide-react", () => ({
  WifiOff: (props: Record<string, unknown>) => <svg {...props} />,
}))

function setNavigatorOnline(isOnline: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value: isOnline,
  })
}

describe("OfflineStatusBanner", () => {
  beforeEach(() => {
    setNavigatorOnline(true)
  })

  it("stays hidden while the browser is online", () => {
    render(<OfflineStatusBanner />)

    expect(
      screen.queryByRole("status", { name: /offline mode/i }),
    ).not.toBeInTheDocument()
  })

  it("shows a customer-friendly offline message when the browser is offline", () => {
    setNavigatorOnline(false)

    render(<OfflineStatusBanner />)

    expect(
      screen.getByRole("status", { name: /offline mode/i }),
    ).toHaveTextContent(/you.re offline/i)
    expect(screen.getByText(/cart and checkout updates may not complete/i))
      .toBeInTheDocument()
  })

  it("responds to browser connectivity changes", () => {
    render(<OfflineStatusBanner />)

    act(() => {
      setNavigatorOnline(false)
      window.dispatchEvent(new Event("offline"))
    })

    expect(screen.getByRole("status", { name: /offline mode/i }))
      .toBeInTheDocument()

    act(() => {
      setNavigatorOnline(true)
      window.dispatchEvent(new Event("online"))
    })

    expect(
      screen.queryByRole("status", { name: /offline mode/i }),
    ).not.toBeInTheDocument()
  })
})
