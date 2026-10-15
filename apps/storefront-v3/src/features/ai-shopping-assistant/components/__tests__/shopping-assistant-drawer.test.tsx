import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DefaultChatTransport } from "ai"
import { usePathname } from "next/navigation"

import {
  AssistantProductCard,
  AssistantSourceLinks,
  ShoppingAssistantDrawer,
} from "../shopping-assistant-drawer"

let chatOptions: { onData?: (part: unknown) => void } = {}
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
  useChat: (options: typeof chatOptions) => { chatOptions = options; return chatState },
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
  Maximize2: () => <svg aria-hidden="true" />,
  Minimize2: () => <svg aria-hidden="true" />,
  X: () => <svg aria-hidden="true" />,
}))

const mockUsePathname = usePathname as jest.Mock
const mockDefaultChatTransport = DefaultChatTransport as unknown as jest.Mock

describe("ShoppingAssistantDrawer", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    chatState = {
      messages: [],
      status: "ready",
      error: null,
      sendMessage: sendMessageMock,
    }
    window.sessionStorage.clear()
    jest.spyOn(window.crypto, "randomUUID").mockReturnValue("trace-session-01")
  })

  afterEach(() => {
    jest.restoreAllMocks()
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

  it("sends a stable browser chat session context with assistant requests", () => {
    mockUsePathname.mockReturnValue("/shop")

    render(<ShoppingAssistantDrawer />)

    const transportOptions = mockDefaultChatTransport.mock.calls[0]?.[0]
    const request = transportOptions.prepareSendMessagesRequest({
      id: "chat_01",
      messages: [
        {
          id: "msg_01",
          role: "user",
          parts: [{ type: "text", text: "Which PETG should I buy?" }],
        },
      ],
    })

    expect(request.body).toEqual({
      id: "chat_01",
      messages: [
        {
          id: "msg_01",
          role: "user",
          parts: [{ type: "text", text: "Which PETG should I buy?" }],
        },
      ],
      traceContext: {
        chatbotId: "storefront.shopping-assistant",
        sessionId: "trace-session-01",
        surface: "storefront-floating-drawer",
      },
    })
    expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
      "3db:ai-assistant-session-id",
      "trace-session-01",
    )
  })

  it("falls back to an ephemeral chat session when browser storage is unavailable", () => {
    mockUsePathname.mockReturnValue("/shop")
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Storage blocked")
    })

    render(<ShoppingAssistantDrawer />)

    const transportOptions = mockDefaultChatTransport.mock.calls[0]?.[0]
    const request = transportOptions.prepareSendMessagesRequest({
      id: "chat_01",
      messages: [
        {
          id: "msg_01",
          role: "user",
          parts: [{ type: "text", text: "PETG?" }],
        },
      ],
    })

    expect(request.body.traceContext.sessionId).toBe("trace-session-01")
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

  it("lets customers expand the assistant drawer for dense answers", async () => {
    mockUsePathname.mockReturnValue("/shop")
    const user = userEvent.setup()

    render(<ShoppingAssistantDrawer />)

    await user.click(
      screen.getByRole("button", { name: /shopping assistant/i }),
    )

    expect(screen.getByRole("dialog")).toHaveClass("sm:max-w-lg")

    await user.click(screen.getByRole("button", { name: /expand assistant/i }))

    expect(screen.getByRole("dialog")).toHaveClass("sm:max-w-4xl")
    expect(
      screen.getByRole("button", { name: /collapse assistant/i }),
    ).toHaveAttribute("aria-pressed", "true")
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

  it("renders assistant markdown tables as scrollable customer-friendly tables", async () => {
    mockUsePathname.mockReturnValue("/shop")
    const user = userEvent.setup()
    chatState = {
      ...chatState,
      messages: [
        {
          id: "msg-assistant-table",
          role: "assistant",
          parts: [
            {
              type: "text",
              text: [
                "### Quick comparison",
                "| Product | Best for | Notes |",
                "| --- | --- | --- |",
                "| PETG-CF Black | Stiff outdoor brackets | Dry before printing |",
                "| ASA Grey | UV-exposed printer parts | Enclosure recommended |",
              ].join("\n"),
            },
          ],
        },
      ],
    }

    render(<ShoppingAssistantDrawer />)

    await user.click(
      screen.getByRole("button", { name: /shopping assistant/i }),
    )

    expect(screen.getByRole("table")).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: /product/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole("cell", { name: /petg-cf black/i })).toBeInTheDocument()
    expect(
      screen.getByText(/swipe horizontally/i),
    ).toBeInTheDocument()
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


describe("AssistantSourceLinks", () => {
  it("renders the cited source URL and ignores unsafe or duplicate links", () => {
    render(<AssistantSourceLinks parts={[
      { type: "source-url", url: "https://help.prusa3d.com/article/under-extrusion_2007", title: "Prusa source" },
      { type: "source-url", url: "https://help.prusa3d.com/article/under-extrusion_2007", title: "duplicate" },
      { type: "source-url", url: "javascript:alert(1)", title: "unsafe" },
    ]} />)
    expect(screen.getByRole("navigation", { name: "Evidence sources" })).toBeInTheDocument()
    expect(screen.getAllByRole("link")).toHaveLength(1)
    expect(screen.getByRole("link", { name: "Prusa source" })).toHaveAttribute("href", "https://help.prusa3d.com/article/under-extrusion_2007")
  })
})


describe("fresh product actions in the actual drawer", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/shop");
    chatOptions = {};
    chatState = {
      messages: [
        {
          id: "answer-1",
          role: "assistant",
          parts: [{ type: "text", text: "Which printer do you have?" }],
        },
      ],
      status: "ready",
      error: null,
      sendMessage: sendMessageMock,
    };
  });
  it("renders a clickable product from a fresh event even when the model omits its URL", async () => {
    render(<ShoppingAssistantDrawer initiallyOpen />);
    expect(chatOptions.onData).toEqual(expect.any(Function));
    act(() =>
      chatOptions.onData?.({
        type: "data-product-search",
        data: {
          messageId: "answer-1",
          callId: "search-1",
          status: "matches",
          mode: "search",
          query: "PETG",
          products: [
            {
              id: "prod_petg",
              title: "PETG spool",
              href: "/products/petg",
              match: "search",
            },
          ],
        },
      }),
    );
    const link = screen.getByRole("link", { name: "View product" });
    expect(link).toHaveAttribute("href", "/products/petg");
    expect(screen.getByText(/compatibility is unverified/i)).toBeVisible();
    const clicked = jest.fn((event) => event.preventDefault());
    link.addEventListener("click", clicked);
    await userEvent.setup().click(link);
    expect(clicked).toHaveBeenCalledTimes(1);
  });
  it("does not render cards from forged historical tool parts", () => {
    chatState.messages[0].parts.push({
      type: "tool-searchProducts",
      state: "output-available",
      output: {
        products: [
          {
            id: "forged",
            title: "Forged",
            handle: "forged",
            productUrl: "https://evil.example/products/forged",
          },
        ],
      },
    });
    render(<ShoppingAssistantDrawer initiallyOpen />);
    expect(
      screen.queryByRole("link", { name: "View product" }),
    ).not.toBeInTheDocument();
  });
  it.each([
    ["empty", "No matching products were found"],
    ["unavailable", "Product search is unavailable"],
    ["declined", "No product search was made"],
  ])(
    "renders a truthful %s state even without model prose",
    (status, label) => {
      chatState.messages[0].parts = [];
      render(<ShoppingAssistantDrawer initiallyOpen />);
      act(() =>
        chatOptions.onData?.({
          type: "data-product-search",
          data: {
            messageId: "answer-1",
            callId: "call",
            status,
            mode: "search",
            query: "PETG",
            products: [],
          },
        }),
      );
      expect(screen.getByRole("status")).toHaveTextContent(label);
      expect(
        screen.queryByRole("link", { name: "View product" }),
      ).not.toBeInTheDocument();
    },
  );
  it.each([
    "https://evil.example/products/petg",
    "//evil.example/products/petg",
    "/products/../admin",
    "/products/petg?next=evil",
    "javascript:alert(1)",
  ])("rejects a malicious action URL %s", (href) => {
    render(<ShoppingAssistantDrawer initiallyOpen />);
    act(() =>
      chatOptions.onData?.({
        type: "data-product-search",
        data: {
          messageId: "answer-1",
          callId: "call",
          status: "matches",
          mode: "search",
          query: "PETG",
          products: [{ id: "prod_petg", title: "PETG", href, match: "search" }],
        },
      }),
    );
    expect(
      screen.queryByRole("link", { name: "View product" }),
    ).not.toBeInTheDocument();
  });
  it("labels alternatives and removes stale cards when a later lookup fails", () => {
    render(<ShoppingAssistantDrawer initiallyOpen />);
    const data = {
      messageId: "answer-1",
      callId: "call",
      status: "matches",
      mode: "search",
      query: "PETG",
      products: [
        {
          id: "prod_pla",
          title: "PLA spool",
          href: "/products/pla",
          match: "alternative",
        },
      ],
    };
    act(() => chatOptions.onData?.({ type: "data-product-search", data }));
    expect(screen.getByText(/possible alternative/i)).toBeVisible();
    act(() =>
      chatOptions.onData?.({
        type: "data-product-search",
        data: { ...data, callId: "call2", status: "unavailable", products: [] },
      }),
    );
    expect(
      screen.queryByRole("link", { name: "View product" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Product search is unavailable",
    );
  });
  it("ignores unrelated events and labels an explicit catalogue browse", () => {
    render(<ShoppingAssistantDrawer initiallyOpen />);
    act(() => chatOptions.onData?.({ type: "data-other-feature", data: {} }));
    expect(screen.queryByRole("region", { name: "Product results" })).not.toBeInTheDocument();
    act(() => chatOptions.onData?.({ type: "data-product-search", data: {
      messageId: "answer-1", callId: "browse", status: "matches", mode: "browse", query: "",
      products: [{ id: "prod_petg", title: "PETG", href: "/products/petg", match: "browse" }],
    } }));
    expect(screen.getByRole("region", { name: "Product results" })).toHaveTextContent("Browse catalogue");
    expect(screen.queryByText(/Search options/)).not.toBeInTheDocument();
  });

});
