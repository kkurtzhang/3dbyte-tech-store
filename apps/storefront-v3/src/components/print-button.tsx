"use client"

import { Button } from "@/components/ui/button"

export interface PrintButtonProps {
  className?: string
  children?: React.ReactNode
}

export function PrintButton({ className, children }: PrintButtonProps) {
  return (
    <Button
      variant="ghost"
      size="lg"
      className={className}
      onClick={() => window.print()}
    >
      {children || "Print"}
    </Button>
  )
}
