"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Bot, LifeBuoy, Loader2, Send, ShoppingBag } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { FormEvent, useEffect, useMemo, useRef, useState } from "react"

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
    <article className="rounded-md border bg-background p-3 shadow-sm">
      <Link href={productHref} className="flex gap-3" aria-label={product.title}>
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
            <p className="mt-1 text-sm text-muted-foreground">{product.price}</p>
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

export function ShoppingAssistantDrawer() {
  const pathname = usePathname()
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/ai-shopping-assistant" }),
    []
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
          className="fixed bottom-6 right-6 z-40 h-14 gap-2 rounded-full border border-border bg-background px-5 shadow-lg hover:bg-muted"
          aria-label="Shopping assistant"
        >
          <Bot className="h-5 w-5" />
          <span className="font-medium">AI Assistant</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        hideOverlay
        className="flex w-full flex-col p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-base font-semibold">
            <Bot className="h-5 w-5" />
            AI Shopping Assistant
          </SheetTitle>
          <SheetDescription>
            Product guidance, compatibility checks, order help, and human support.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto bg-muted/20 px-5 py-5">
          {messages.length === 0 ? (
            <div className="rounded-md border bg-background p-4 text-sm text-muted-foreground">
              <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                <LifeBuoy className="h-4 w-4" />
                Human support is available
              </div>
              Ask for product help, order/tracking support, or say you want a
              human to follow up. I will ask for confirmation before creating a
              support ticket.
            </div>
          ) : null}
          {messages.map((message) => {
            const content = getMessageText(message)

            if (!content) return null

            return (
              <div
                className={`flex w-full ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
                key={message.id}
              >
                <div
                  className={`max-w-[85%] rounded-md px-3 py-2 text-sm shadow-sm ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border bg-background"
                  }`}
                >
                  {content}
                </div>
              </div>
            )
          })}
          {isStreaming ? (
            <div className="flex justify-start">
              <div className="flex max-w-[85%] items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">Thinking...</span>
              </div>
            </div>
          ) : null}
          {error ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Assistant unavailable. Please try again.
            </p>
          ) : null}
          <div ref={messagesEndRef} />
        </div>
        <form className="border-t bg-background p-4" onSubmit={handleSubmit}>
          <div className="flex items-end gap-2">
            <Textarea
              aria-label="Ask the shopping assistant"
              className="min-h-[44px] max-h-[120px] resize-none"
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
              placeholder="Ask about products, orders, or support..."
              value={input}
            />
            <Button
              disabled={!input.trim() || isStreaming}
              type="submit"
              size="icon"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            AI can make mistakes. Verify important information.
          </p>
        </form>
      </SheetContent>
    </Sheet>
  )
}
