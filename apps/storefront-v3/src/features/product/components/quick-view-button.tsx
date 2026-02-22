"use client"

import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import { cn } from "@/lib/utils"

interface QuickViewButtonProps {
  onClick: () => void
  className?: string
}

export function QuickViewButton({ onClick, className }: QuickViewButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn(
        // Base styles
        "font-mono uppercase tracking-wider text-[10px]",
        // Hover reveal behavior
        "opacity-0 group-hover:opacity-100 md:opacity-100",
        "transition-opacity duration-200",
        // Button styling
        "gap-1.5 h-8 px-3",
        className
      )}
    >
      <Eye className="h-3.5 w-3.5" />
      <span>Quick View</span>
    </Button>
  )
}
