"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import {
  Bot,
  LifeBuoy,
  Loader2,
  Maximize2,
  Minimize2,
  Send,
  ShoppingBag,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const ASSISTANT_SESSION_STORAGE_KEY = "3db:ai-assistant-session-id"
const ASSISTANT_CHATBOT_ID = "storefront.shopping-assistant"
const ASSISTANT_SURFACE = "storefront-floating-drawer"

type PrepareSendMessagesRequestInput = {
  id: string
  messages: unknown[]
}

export type AssistantProductSuggestion = {
  id: string
  title: string
  handle: string
  thumbnail?: string | null
  price?: string | null
  inStock?: boolean | null
  reason?: string | null
}

export function AssistantProductCard({
  product,
}: {
  product: AssistantProductSuggestion
}) {
  const productHref = `/products/${product.handle}`

  return (
    <article className="rounded-sm border border-border bg-background p-3 shadow-sm">
      <Link
        href={productHref}
        className="flex gap-3"
        aria-label={product.title}
      >
        {product.thumbnail ? (
          <img
            src={product.thumbnail}
            alt=""
            className="h-16 w-16 rounded-sm object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-sm bg-muted">
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
        <Button asChild size="sm" variant="outline" className="rounded-sm">
          <Link href={productHref}>View product</Link>
        </Button>
      </div>
    </article>
  )
}

function getMessageText(message: { parts?: Array<Record<string, unknown>> }) {
  return (
    message.parts
      ?.filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text as string)
      .join("") ?? ""
  )
}

function createAssistantSessionId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID()
  }

  return `assistant-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function getAssistantSessionId() {
  if (typeof window === "undefined") {
    return createAssistantSessionId()
  }

  try {
    const existing = window.sessionStorage.getItem(
      ASSISTANT_SESSION_STORAGE_KEY,
    )

    if (existing) {
      return existing
    }

    const sessionId = createAssistantSessionId()
    window.sessionStorage.setItem(ASSISTANT_SESSION_STORAGE_KEY, sessionId)

    return sessionId
  } catch {
    return createAssistantSessionId()
  }
}

type AssistantContentBlock =
  | { text: string; type: "heading" }
  | { text: string; type: "paragraph" }
  | { items: string[]; ordered: boolean; type: "list" }
  | { headers: string[]; rows: string[][]; type: "table" }

type AssistantParseState = {
  blocks: AssistantContentBlock[]
  listItems: string[]
  orderedList: boolean
  paragraphLines: string[]
}

function flushParagraph(state: AssistantParseState): AssistantParseState {
  if (state.paragraphLines.length === 0) return state

  return {
    ...state,
    blocks: [
      ...state.blocks,
      { text: state.paragraphLines.join(" "), type: "paragraph" },
    ],
    paragraphLines: [],
  }
}

function flushList(state: AssistantParseState): AssistantParseState {
  if (state.listItems.length === 0) return state

  return {
    ...state,
    blocks: [
      ...state.blocks,
      { items: state.listItems, ordered: state.orderedList, type: "list" },
    ],
    listItems: [],
  }
}

function parseTableRow(line: string) {
  if (!line.includes("|")) return null

  const cells = line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim())

  return cells.length > 1 ? cells : null
}

function isTableDivider(line: string | undefined, cellCount: number) {
  if (!line) return false

  const cells = parseTableRow(line.trim())

  return (
    cells?.length === cellCount &&
    cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, "")))
  )
}

function parseAssistantContent(content: string) {
  const initialState: AssistantParseState = {
    blocks: [],
    listItems: [],
    orderedList: false,
    paragraphLines: [],
  }

  const lines = content.split(/\r?\n/)
  let state = initialState
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const trimmedLine = line.trim()

    if (!trimmedLine) {
      state = flushList(flushParagraph(state))
      index += 1
      continue
    }

    const heading = trimmedLine.match(/^#{1,3}\s+(.+)$/)

    if (heading) {
      const flushedState = flushList(flushParagraph(state))

      state = {
        ...flushedState,
        blocks: [
          ...flushedState.blocks,
          { text: heading[1].trim(), type: "heading" as const },
        ],
      }
      index += 1
      continue
    }

    const tableHeader = parseTableRow(trimmedLine)

    if (tableHeader && isTableDivider(lines[index + 1], tableHeader.length)) {
      let rowIndex = index + 2
      const rows: string[][] = []

      while (rowIndex < lines.length) {
        const row = parseTableRow(lines[rowIndex].trim())

        if (!row || row.length !== tableHeader.length) break

        rows.push(row)
        rowIndex += 1
      }

      const flushedState = flushList(flushParagraph(state))
      state = {
        ...flushedState,
        blocks: [
          ...flushedState.blocks,
          { headers: tableHeader, rows, type: "table" as const },
        ],
      }
      index = rowIndex
      continue
    }

    const listItem = trimmedLine.match(/^((?:[-*])|(?:\d+\.))\s+(.+)$/)

    if (listItem) {
      const ordered = /^\d+\.$/.test(listItem[1])
      const flushedState = flushParagraph(state)
      const listState =
        flushedState.listItems.length > 0 &&
        flushedState.orderedList !== ordered
          ? flushList(flushedState)
          : flushedState

      state = {
        ...listState,
        listItems: [...listState.listItems, listItem[2].trim()],
        orderedList: ordered,
      }
      index += 1
      continue
    }

    const flushedState = flushList(state)

    state = {
      ...flushedState,
      paragraphLines: [...flushedState.paragraphLines, trimmedLine],
    }
    index += 1
  }

  return flushList(flushParagraph(state)).blocks
}

function renderInlineText(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((segment, index) => {
      const strongText = segment.match(/^\*\*([^*]+)\*\*$/)?.[1]

      if (strongText) {
        return (
          <strong
            className="font-semibold text-foreground"
            key={`${segment}-${index}`}
          >
            {strongText}
          </strong>
        )
      }

      return segment
    })
}

function AssistantTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: string[][]
}) {
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-sm border border-border bg-background">
        <table className="min-w-full border-collapse text-left text-xs">
          <thead className="bg-muted/70 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            <tr>
              {headers.map((header) => (
                <th
                  className="whitespace-nowrap border-b border-border px-3 py-2 font-semibold"
                  key={header}
                  scope="col"
                >
                  {renderInlineText(header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                className="border-b border-border/70 last:border-0"
                key={`${row.join("|")}-${rowIndex}`}
              >
                {row.map((cell, cellIndex) => (
                  <td
                    className="min-w-[120px] align-top px-3 py-2 leading-relaxed text-foreground"
                    key={`${cell}-${cellIndex}`}
                  >
                    {renderInlineText(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
        Swipe horizontally to compare columns.
      </p>
    </div>
  )
}

function FormattedAssistantMessage({ content }: { content: string }) {
  const blocks = parseAssistantContent(content)

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
          )
        }

        if (block.type === "list") {
          const ListTag = block.ordered ? "ol" : "ul"

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
          )
        }

        if (block.type === "table") {
          return (
            <AssistantTable
              headers={block.headers}
              key={`${block.headers.join("|")}-${index}`}
              rows={block.rows}
            />
          )
        }

        return (
          <p key={`${block.text}-${index}`}>{renderInlineText(block.text)}</p>
        )
      })}
    </div>
  )
}

export function ShoppingAssistantDrawer() {
  const pathname = usePathname()
  const [input, setInput] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const assistantSessionId = useMemo(() => getAssistantSessionId(), [])
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai-shopping-assistant",
        prepareSendMessagesRequest: ({
          id,
          messages,
        }: PrepareSendMessagesRequestInput) => ({
          body: {
            id,
            messages,
            traceContext: {
              chatbotId: ASSISTANT_CHATBOT_ID,
              sessionId: assistantSessionId,
              surface: ASSISTANT_SURFACE,
            },
          },
        }),
      }),
    [assistantSessionId],
  )
  const { messages, sendMessage, status, error } = useChat({ transport })
  const isStreaming = status === "submitted" || status === "streaming"

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, status])

  if (pathname?.startsWith("/checkout")) return null

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextInput = input.trim()

    if (!nextInput || isStreaming) return

    sendMessage({ text: nextInput })
    setInput("")
  }

  return (
    <Sheet modal={false}>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 z-40 h-12 w-12 sm:w-auto gap-2 rounded-sm border border-primary bg-background p-0 sm:px-5 text-primary shadow-[0_4px_20px_rgba(6,182,212,0.15)] transition-all duration-200 hover:bg-primary hover:text-primary-foreground font-mono uppercase tracking-wider text-sm"
          aria-label="Shopping assistant"
        >
          <Sparkles className="h-4 w-4 animate-pulse" />
          <span className="hidden sm:inline">AI Assistant</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        hideOverlay
        className={cn(
          "flex w-full flex-col border-l border-border/80 p-0 shadow-2xl transition-[max-width] duration-300 dark:border-border/20 rounded-none",
          isExpanded ? "sm:max-w-4xl" : "sm:max-w-lg"
        )}
      >
        <Button
          aria-label={isExpanded ? "Collapse assistant" : "Expand assistant"}
          aria-pressed={isExpanded}
          className="absolute right-12 top-4 z-10 h-8 w-8 rounded-sm opacity-70 hover:opacity-100"
          onClick={() => setIsExpanded((current) => !current)}
          size="icon"
          type="button"
          variant="ghost"
        >
          {isExpanded ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
        <SheetHeader className="border-b border-primary/10 bg-muted/30 px-6 py-5 text-left">
          <SheetTitle className="flex items-center gap-2 text-lg font-mono font-bold tracking-tight text-foreground">
            <Bot className="h-5 w-5 text-primary" />
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
              <div className="flex flex-col items-center justify-center space-y-4 rounded-sm border border-border bg-background p-5 text-center shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-primary/20 bg-primary/5">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <p className="max-w-[280px] text-sm text-muted-foreground">
                  I'm your AI shopping assistant. Ask about products,
                  compatibility, shipping estimates, or recent orders.
                </p>
              </div>
              <div className="rounded-sm border border-primary/10 bg-primary/5 p-4 text-sm text-muted-foreground shadow-sm">
                <div className="mb-2 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-primary">
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
            const content = getMessageText(message)

            if (!content) return null

            return (
              <div
                className={`flex w-full animate-in slide-in-from-bottom-2 fade-in duration-300 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
                key={message.id}
              >
                <div
                  className={`px-4 py-3 text-sm shadow-sm ${
                    message.role === "user"
                      ? "max-w-[85%] rounded-sm border border-primary bg-primary/10 text-foreground"
                      : "w-full max-w-full rounded-sm border border-border bg-muted/30 sm:max-w-[92%]"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <FormattedAssistantMessage content={content} />
                  ) : (
                    <span className="whitespace-pre-wrap">{content}</span>
                  )}
                </div>
              </div>
            )
          })}
          {isStreaming ? (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="flex max-w-[85%] items-center gap-2 rounded-sm border border-border bg-muted/30 px-4 py-3 text-sm shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground font-mono text-xs">Thinking...</span>
              </div>
            </div>
          ) : null}
          {error ? (
            <div className="flex justify-center animate-in fade-in duration-300">
              <p className="rounded-sm border border-destructive bg-destructive/5 px-3 py-1.5 font-mono text-xs uppercase tracking-tight text-destructive">
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
          <div className="relative flex items-end gap-2 rounded-sm border border-border bg-muted/30 p-2 transition-all duration-200 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30">
            <Textarea
              aria-label="Ask the shopping assistant"
              className="max-h-[120px] min-h-[44px] resize-none border-0 bg-transparent p-2 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 font-mono text-xs"
              maxLength={4_000}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  if (input.trim() && !isStreaming) {
                    event.currentTarget.form?.requestSubmit()
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
              className="h-10 w-10 shrink-0 rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground/70 font-mono tracking-tight">
            AI can make mistakes. Verify important information.
          </p>
        </form>
      </SheetContent>
    </Sheet>
  )
}
