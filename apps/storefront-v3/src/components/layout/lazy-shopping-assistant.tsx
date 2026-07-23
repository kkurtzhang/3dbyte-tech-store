"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"

const ShoppingAssistantDrawer = dynamic(
  () =>
    import(
      "@/features/ai-shopping-assistant/components/shopping-assistant-drawer"
    ).then((module) => module.ShoppingAssistantDrawer),
  {
    loading: () => (
      <div
        aria-live="polite"
        className="fixed bottom-6 right-6 z-40 rounded-sm border bg-background px-4 py-3 font-mono text-xs uppercase text-muted-foreground shadow-lg"
      >
        Loading assistant…
      </div>
    ),
    ssr: false,
  }
)

export function LazyShoppingAssistant() {
  const [activated, setActivated] = useState(false)

  if (activated) {
    return <ShoppingAssistantDrawer initiallyOpen />
  }

  return (
    <Button
      aria-label="Shopping assistant"
      className="fixed bottom-6 right-6 z-40 h-12 w-12 gap-2 rounded-sm border border-primary bg-background p-0 font-mono text-sm uppercase tracking-wider text-primary shadow-[0_4px_20px_rgba(6,182,212,0.15)] transition-all duration-200 hover:bg-primary hover:text-primary-foreground sm:w-auto sm:px-5"
      onClick={() => setActivated(true)}
      type="button"
    >
      <Sparkles className="h-4 w-4 animate-pulse" />
      <span className="hidden sm:inline">AI Assistant</span>
    </Button>
  )
}
