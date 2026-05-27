import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { usePathname } from "next/navigation"

import {
  AssistantProductCard,
  ShoppingAssistantDrawer,
} from "../shopping-assistant-drawer"

const sendMessageMock = jest.fn()
let chatState = {
  messages: [] as Array<{
    id: string
    role: "user" | "assistant"
    parts: Array<Record<string, unknown>>
  }>,
  status: "ready",
  error: null as Error | null,
  sendMessage: sendMessageMock,
}

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}))

jest.mock("@ai-sdk/react", () => ({
  useChat: () => chatState,
}))

jest.mock("ai", () => ({
  DefaultChatTransport: jest.fn().mockImplementation((options) => options),
}))

jest.mock("lucide-react", () => ({
  Bot: () => <svg aria-hidden="true" />,
  Send: () => <svg aria-hidden="true" />,
  ShoppingBag: () => <svg aria-hidden="true" />,
  Sparkles: () => <svg aria-hidden="true" />,
  Loader2: () => <svg aria-hidden="true" />,
  LifeBuoy: () => <svg aria-hidden="true" />,
  X: () => <svg aria-hidden="true" />,
}))

const mockUsePathname = usePathname as jest.Mock

describe("ShoppingAssistantDrawer", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    chatState = {
      messages: [],
      status: "ready",
      error: null,
      sendMessage: sendMessageMock,
    }
  })

  it("floats on shopping surfaces and sends messages through the assistant API", async () => {
    mockUsePathname.mockReturnValue("/shop")
    const user = userEvent.setup()

    render(<ShoppingAssistantDrawer />)

    await user.click(
      screen.getByRole("button", { name: /shopping assistant/i }),
    )
    await user.type(
      screen.getByRole("textbox", { name: /ask the shopping assistant/i }),
      "Which hotend fits my K1?",
    )
    await user.click(screen.getByRole("button", { name: /send/i }))

    expect(sendMessageMock).toHaveBeenCalledWith({
      text: "Which hotend fits my K1?",
    })
  })

  it("shows a streaming pending state", async () => {
    mockUsePathname.mockReturnValue("/shop")
    const user = userEvent.setup()
    chatState = {
      ...chatState,
      status: "streaming",
      messages: [
        {
          id: "msg-user",
          role: "user",
          parts: [{ type: "text", text: "Which hotend fits my K1?" }],
        },
      ],
    }

    render(<ShoppingAssistantDrawer />)

    await user.click(
      screen.getByRole("button", { name: /shopping assistant/i }),
    )

    await waitFor(() => {
      expect(screen.getByText(/thinking/i)).toBeInTheDocument()
    })
  })

  it("is hidden during checkout", () => {
    mockUsePathname.mockReturnValue("/checkout")

    render(<ShoppingAssistantDrawer />)

    expect(
      screen.queryByRole("button", { name: /shopping assistant/i }),
    ).not.toBeInTheDocument()
  })

  it("surfaces human support without creating tickets from the browser", async () => {
    mockUsePathname.mockReturnValue("/shop")
    const user = userEvent.setup()

    render(<ShoppingAssistantDrawer />)

    await user.click(
      screen.getByRole("button", { name: /shopping assistant/i }),
    )

    expect(screen.getByText(/human support is available/i)).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /create ticket/i }),
    ).not.toBeInTheDocument()
  })

  it("renders the polished assistant shell from the drawer UI update", async () => {
    mockUsePathname.mockReturnValue("/shop")
    const user = userEvent.setup()

    render(<ShoppingAssistantDrawer />)

    await user.click(
      screen.getByRole("button", { name: /shopping assistant/i }),
    )

    expect(screen.getByText(/instant product guidance/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/ask me anything/i)).toBeInTheDocument()
    expect(screen.getByText(/ai can make mistakes/i)).toBeInTheDocument()
  })

  it("formats assistant markdown-style recommendations for scanning", async () => {
    mockUsePathname.mockReturnValue("/shop")
    const user = userEvent.setup()
    chatState = {
      ...chatState,
      messages: [
        {
          id: "msg-assistant",
          role: "assistant",
          parts: [
            {
              type: "text",
              text: [
                "### PETG for outdoor parts",
                "- Use PETG when the part needs sunlight and moisture resistance.",
                "- Choose black PETG for better UV tolerance.",
                "",
                "**Tip:** Dry the spool before printing.",
              ].join("\n"),
            },
            { type: "tool-searchProducts", state: "output-available" },
          ],
        },
      ],
    }

    render(<ShoppingAssistantDrawer />)

    await user.click(
      screen.getByRole("button", { name: /shopping assistant/i }),
    )

    expect(
      screen.getByRole("heading", { name: /petg for outdoor parts/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/use petg when the part needs sunlight/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/dry the spool/i)).toBeInTheDocument()
  })

  it("renders product suggestions as customer-clicked links without cart mutation", () => {
    render(
      <AssistantProductCard
        product={{
          id: "prod_123",
          title: "LDO Voron 2.4 Kit",
          handle: "ldo-voron-24-kit",
          thumbnail: "/kit.jpg",
          price: "$1,499.00",
          inStock: true,
          reason: "Good match for a complete CoreXY build.",
        }}
      />,
    )

    expect(
      screen.getByRole("link", { name: /ldo voron 2.4 kit/i }),
    ).toHaveAttribute("href", "/products/ldo-voron-24-kit")
    expect(screen.getByRole("link", { name: /view product/i })).toHaveAttribute(
      "href",
      "/products/ldo-voron-24-kit",
    )
    expect(
      screen.queryByRole("button", { name: /add to cart/i }),
    ).not.toBeInTheDocument()
  })
})
