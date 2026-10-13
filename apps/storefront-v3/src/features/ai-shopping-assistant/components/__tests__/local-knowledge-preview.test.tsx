import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import fixtures from "../../../../../scripts/__tests__/fixtures/local-knowledge-preview.json";
import { ShoppingAssistantDrawer } from "../shopping-assistant-drawer";

let mockMessages: Array<{
  id: string;
  role: "assistant";
  parts: Array<Record<string, unknown>>;
}> = [];
jest.mock("next/navigation", () => ({ usePathname: () => "/help" }));
jest.mock("@ai-sdk/react", () => ({
  useChat: () => ({
    messages: mockMessages,
    status: "ready",
    error: null,
    sendMessage: jest.fn(),
  }),
}));
jest.mock("ai", () => ({
  DefaultChatTransport: jest.fn().mockImplementation((options) => options),
}));
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
}));

describe("drawer rendering of captured local project responses", () => {
  it.each(fixtures.cases)(
    "renders $id text and its actual safe source links",
    async (example) => {
      mockMessages = [
        { id: example.id, role: "assistant", parts: example.response_parts },
      ];
      const user = userEvent.setup();
      render(<ShoppingAssistantDrawer />);
      await user.click(
        screen.getByRole("button", { name: /shopping assistant/i }),
      );
      expect(screen.getByText(/Local development/)).toBeInTheDocument();
      for (const source of example.expected_source_links) {
        const link = screen.getByRole("link", { name: source.title });
        expect(link).toHaveAttribute("href", new URL(source.url).href);
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
      }
      if (example.expected_source_links.length === 0) {
        expect(
          screen.queryByRole("navigation", { name: "Evidence sources" }),
        ).not.toBeInTheDocument();
      }
      if (example.id === "clarification") {
        expect(
          screen.getByText(/Which item or material do you mean/),
        ).toBeInTheDocument();
      }
      if (example.id === "physical_kit") {
        expect(
          screen.getByText(/Digital model access and its licence are separate/),
        ).toBeInTheDocument();
      }
    },
  );
});
