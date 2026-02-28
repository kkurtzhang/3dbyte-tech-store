"use client"

import { type ReactNode } from "react"
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"

export interface FilterSectionProps {
  title: string | ReactNode
  defaultOpen?: boolean
  children: ReactNode
  selectedCount?: number
  onClear?: () => void
  onSelectAll?: () => void
  value: string
}

export function FilterSection({
  title,
  defaultOpen,
  children,
  selectedCount,
  onClear,
  onSelectAll,
  value,
}: FilterSectionProps) {
  return (
    <AccordionItem value={value} defaultChecked={defaultOpen}>
      <AccordionTrigger className="py-3 text-sm font-medium hover:text-primary">
        <span>{title}</span>
        {selectedCount !== undefined && selectedCount > 0 && (
          <>
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              ({selectedCount} selected)
            </span>
            {onClear && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  onClear()
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.stopPropagation()
                    onClear()
                  }
                }}
                className="ml-auto mr-2 cursor-pointer text-xs text-muted-foreground hover:text-primary"
              >
                Clear
              </span>
            )}
          </>
        )}
        {onSelectAll && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              onSelectAll()
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.stopPropagation()
                onSelectAll()
              }
            }}
            className="ml-auto mr-2 cursor-pointer text-xs text-muted-foreground hover:text-primary"
          >
            All
          </span>
        )}
      </AccordionTrigger>
      <AccordionContent>{children}</AccordionContent>
    </AccordionItem>
  )
}
