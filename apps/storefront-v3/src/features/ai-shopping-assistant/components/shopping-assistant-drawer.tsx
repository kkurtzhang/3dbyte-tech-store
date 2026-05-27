"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  Bot,
  LifeBuoy,
  Loader2,
  Send,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

export type AssistantProductSuggestion = {
  id: string;
  title: string;
  handle: string;
  thumbnail?: string | null;
  price?: string | null;
  inStock?: boolean | null;
  reason?: string | null;
};

export function AssistantProductCard({
  product,
}: {
  product: AssistantProductSuggestion;
}) {
  const productHref = `/products/${product.handle}`;

  return (
    <article className="rounded-md border bg-background p-3 shadow-sm">
      <Link
        href={productHref}
        className="flex gap-3"
        aria-label={product.title}
      >
        {product.thumbnail ? (
          <img
            src={product.thumbnail}
            alt=""
            className="h-16 w-16 rounded-md object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-md bg-muted">
            <ShoppingBag className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-medium">{product.title}</h3>
          {product.price ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {product.price}
            </p>
          ) : null}
          {product.reason ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {product.reason}
            </p>
          ) : null}
        </div>
      </Link>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {product.inStock === false ? "Check availability" : "Suggested match"}
        </span>
        <Button asChild size="sm" variant="outline">
          <Link href={productHref}>View product</Link>
        </Button>
      </div>
    </article>
  );
}

function getMessageText(message: { parts?: Array<Record<string, unknown>> }) {
  return (
    message.parts
      ?.filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text as string)
      .join("") ?? ""
  );
}

type AssistantContentBlock =
  | { text: string; type: "heading" }
  | { text: string; type: "paragraph" }
  | { items: string[]; ordered: boolean; type: "list" };

type AssistantParseState = {
  blocks: AssistantContentBlock[];
  listItems: string[];
  orderedList: boolean;
  paragraphLines: string[];
};

function flushParagraph(state: AssistantParseState): AssistantParseState {
  if (state.paragraphLines.length === 0) return state;

  return {
    ...state,
    blocks: [
      ...state.blocks,
      { text: state.paragraphLines.join(" "), type: "paragraph" },
    ],
    paragraphLines: [],
  };
}

function flushList(state: AssistantParseState): AssistantParseState {
  if (state.listItems.length === 0) return state;

  return {
    ...state,
    blocks: [
      ...state.blocks,
      { items: state.listItems, ordered: state.orderedList, type: "list" },
    ],
    listItems: [],
  };
}

function parseAssistantContent(content: string) {
  const initialState: AssistantParseState = {
    blocks: [],
    listItems: [],
    orderedList: false,
    paragraphLines: [],
  };

  const parsedState = content.split(/\r?\n/).reduce((state, line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      return flushList(flushParagraph(state));
    }

    const heading = trimmedLine.match(/^#{1,3}\s+(.+)$/);

    if (heading) {
      const flushedState = flushList(flushParagraph(state));

      return {
        ...flushedState,
        blocks: [
          ...flushedState.blocks,
          { text: heading[1].trim(), type: "heading" as const },
        ],
      };
    }

    const listItem = trimmedLine.match(/^((?:[-*])|(?:\d+\.))\s+(.+)$/);

    if (listItem) {
      const ordered = /^\d+\.$/.test(listItem[1]);
      const flushedState = flushParagraph(state);
      const listState =
        flushedState.listItems.length > 0 &&
        flushedState.orderedList !== ordered
          ? flushList(flushedState)
          : flushedState;

      return {
        ...listState,
        listItems: [...listState.listItems, listItem[2].trim()],
        orderedList: ordered,
      };
    }

    const flushedState = flushList(state);

    return {
      ...flushedState,
      paragraphLines: [...flushedState.paragraphLines, trimmedLine],
    };
  }, initialState);

  return flushList(flushParagraph(parsedState)).blocks;
}

function renderInlineText(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((segment, index) => {
      const strongText = segment.match(/^\*\*([^*]+)\*\*$/)?.[1];

      if (strongText) {
        return (
          <strong
            className="font-semibold text-foreground"
            key={`${segment}-${index}`}
          >
            {strongText}
          </strong>
        );
      }

      return segment;
    });
}

function FormattedAssistantMessage({ content }: { content: string }) {
  const blocks = parseAssistantContent(content);

  return (
    <div className="space-y-2 leading-relaxed">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h3
              className="text-sm font-semibold text-foreground"
              key={`${block.text}-${index}`}
            >
              {renderInlineText(block.text)}
            </h3>
          );
        }

        if (block.type === "list") {
          const ListTag = block.ordered ? "ol" : "ul";

          return (
            <ListTag
              className={`space-y-1 pl-4 ${
                block.ordered ? "list-decimal" : "list-disc"
              }`}
              key={`${block.items.join("|")}-${index}`}
            >
              {block.items.map((item) => (
                <li key={item}>{renderInlineText(item)}</li>
              ))}
            </ListTag>
          );
        }

        return (
          <p key={`${block.text}-${index}`}>{renderInlineText(block.text)}</p>
        );
      })}
    </div>
  );
}

export function ShoppingAssistantDrawer() {
  const pathname = usePathname();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/ai-shopping-assistant" }),
    [],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });
  const isStreaming = status === "submitted" || status === "streaming";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  if (pathname?.startsWith("/checkout")) return null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextInput = input.trim();

    if (!nextInput || isStreaming) return;

    sendMessage({ text: nextInput });
    setInput("");
  }

  return (
    <Sheet modal={false}>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 z-40 h-14 gap-2 rounded-full border-none bg-gradient-to-r from-cyan-500 via-indigo-500 to-rose-500 px-6 text-white shadow-lg transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl"
          aria-label="Shopping assistant"
        >
          <Sparkles className="h-5 w-5 animate-pulse" />
          <span className="text-base font-semibold">AI Assistant</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        hideOverlay
        className="flex w-full flex-col border-l-0 p-0 shadow-2xl sm:max-w-md"
      >
        <SheetHeader className="border-b bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-rose-500/10 px-6 py-5 text-left backdrop-blur-sm">
          <SheetTitle className="flex items-center gap-2 bg-gradient-to-r from-cyan-700 via-indigo-700 to-rose-700 bg-clip-text text-xl font-bold text-transparent dark:from-cyan-300 dark:via-indigo-300 dark:to-rose-300">
            <Bot className="h-6 w-6 text-cyan-600 dark:text-cyan-300" />
            AI Shopping Assistant
          </SheetTitle>
          <SheetDescription className="text-sm">
            Instant product guidance, compatibility checks, order help, and
            human support.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto bg-muted/10 px-6 py-6 scroll-smooth">
          {messages.length === 0 ? (
            <div className="space-y-4 animate-in fade-in duration-500">
              <div className="flex flex-col items-center justify-center space-y-4 rounded-md border bg-background/80 p-5 text-center shadow-sm">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-100 via-indigo-100 to-rose-100 dark:from-cyan-950/40 dark:via-indigo-950/40 dark:to-rose-950/40">
                  <Sparkles className="h-8 w-8 text-cyan-600 dark:text-cyan-300" />
                </div>
                <p className="max-w-[280px] text-sm text-muted-foreground">
                  I'm your AI shopping assistant. Ask about products,
                  compatibility, shipping estimates, or recent orders.
                </p>
              </div>
              <div className="rounded-md border bg-background p-4 text-sm text-muted-foreground shadow-sm">
                <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                  <LifeBuoy className="h-4 w-4" />
                  Human support is available
                </div>
                Ask for product help, order/tracking support, or say you want a
                human to follow up. I will ask for confirmation before creating
                a support ticket.
              </div>
            </div>
          ) : null}
          {messages.map((message) => {
            const content = getMessageText(message);

            if (!content) return null;

            return (
              <div
                className={`flex w-full animate-in slide-in-from-bottom-2 fade-in duration-300 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
                key={message.id}
              >
                <div
                  className={`max-w-[85%] px-4 py-3 text-sm shadow-sm ${
                    message.role === "user"
                      ? "rounded-2xl rounded-tr-sm bg-gradient-to-r from-primary to-primary/90 text-primary-foreground"
                      : "rounded-2xl rounded-tl-sm border bg-background"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <FormattedAssistantMessage content={content} />
                  ) : (
                    <span className="whitespace-pre-wrap">{content}</span>
                  )}
                </div>
              </div>
            );
          })}
          {isStreaming ? (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="flex max-w-[85%] items-center gap-2 rounded-2xl rounded-tl-sm border bg-background px-4 py-3 text-sm shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">Thinking...</span>
              </div>
            </div>
          ) : null}
          {error ? (
            <div className="flex justify-center animate-in fade-in duration-300">
              <p className="rounded-full bg-destructive/10 px-3 py-1 text-sm text-destructive">
                Assistant unavailable. Please try again.
              </p>
            </div>
          ) : null}
          <div ref={messagesEndRef} />
        </div>
        <form
          className="border-t bg-background p-4 shadow-[0_-10px_40px_rgb(0,0,0,0.03)]"
          onSubmit={handleSubmit}
        >
          <div className="relative flex items-end gap-2 rounded-xl border bg-muted/50 p-2 transition-all duration-200 focus-within:border-cyan-500/50 focus-within:ring-2 focus-within:ring-cyan-500/40">
            <Textarea
              aria-label="Ask the shopping assistant"
              className="max-h-[120px] min-h-[44px] resize-none border-0 bg-transparent p-2 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              maxLength={4_000}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (input.trim() && !isStreaming) {
                    event.currentTarget.form?.requestSubmit();
                  }
                }
              }}
              placeholder="Ask me anything..."
              value={input}
            />
            <Button
              disabled={!input.trim() || isStreaming}
              type="submit"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-500 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground/70">
            AI can make mistakes. Verify important information.
          </p>
        </form>
      </SheetContent>
    </Sheet>
  );
}
