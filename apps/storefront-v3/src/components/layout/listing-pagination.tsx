import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

type PaginationItem = number | "left-ellipsis" | "right-ellipsis"

interface ListingPaginationProps {
  buildHref: (page: number) => string
  currentPage: number
  pageSize: number
  totalItems: number
  ariaLabel?: string
  itemLabel?: string
}

function getPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const firstPage = 1
  const lastPage = totalPages
  let left = Math.max(2, currentPage - 1)
  let right = Math.min(totalPages - 1, currentPage + 1)

  if (currentPage <= 4) {
    left = 2
    right = 5
  }

  if (currentPage >= totalPages - 3) {
    left = totalPages - 4
    right = totalPages - 1
  }

  const middlePages = Array.from(
    { length: Math.max(0, right - left + 1) },
    (_, index) => left + index
  )

  return [
    firstPage,
    ...(left > 2 ? (["left-ellipsis"] as const) : []),
    ...middlePages,
    ...(right < totalPages - 1 ? (["right-ellipsis"] as const) : []),
    lastPage,
  ]
}

function PaginationControl({
  children,
  className,
  disabled,
  href,
  label,
}: {
  children: React.ReactNode
  className?: string
  disabled?: boolean
  href: string
  label: string
}) {
  const baseClassName = cn(
    "inline-flex h-10 items-center justify-center rounded-sm border font-mono text-sm transition-colors",
    className
  )

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        aria-label={label}
        className={cn(baseClassName, "cursor-not-allowed border-border/60 text-muted-foreground/50")}
      >
        {children}
      </span>
    )
  }

  return (
    <Link
      aria-label={label}
      className={cn(baseClassName, "border-border bg-card hover:border-primary/50 hover:bg-accent")}
      href={href}
    >
      {children}
    </Link>
  )
}

export function ListingPagination({
  buildHref,
  currentPage,
  pageSize,
  totalItems,
  ariaLabel = "Product pagination",
  itemLabel = "products",
}: ListingPaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize)

  if (totalPages <= 1) {
    return null
  }

  const page = Math.min(Math.max(currentPage, 1), totalPages)
  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, totalItems)
  const paginationItems = getPaginationItems(page, totalPages)
  const itemNoun = totalItems === 1 ? itemLabel.replace(/s$/, "") : itemLabel

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="font-mono text-xs uppercase text-muted-foreground">
        Showing {startItem}-{endItem} of {totalItems} {itemNoun}
      </p>
      <nav
        aria-label={ariaLabel}
        className="flex max-w-full flex-wrap items-center justify-center gap-2"
        role="navigation"
      >
        <PaginationControl
          className="w-10 sm:w-auto sm:px-3"
          disabled={page === 1}
          href={buildHref(Math.max(1, page - 1))}
          label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only sm:ml-1">Previous</span>
        </PaginationControl>

        {paginationItems.map((item) => {
          if (typeof item === "string") {
            return (
              <span
                aria-hidden="true"
                className="inline-flex h-10 w-8 items-center justify-center font-mono text-sm text-muted-foreground"
                key={item}
              >
                ...
              </span>
            )
          }

          const isCurrent = item === page

          return (
            <Link
              aria-current={isCurrent ? "page" : undefined}
              aria-label={`Page ${item}`}
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-sm border font-mono text-sm transition-colors",
                isCurrent
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary/50 hover:bg-accent"
              )}
              href={buildHref(item)}
              key={item}
            >
              {item}
            </Link>
          )
        })}

        <PaginationControl
          className="w-10 sm:w-auto sm:px-3"
          disabled={page === totalPages}
          href={buildHref(Math.min(totalPages, page + 1))}
          label="Next page"
        >
          <span className="sr-only sm:not-sr-only sm:mr-1">Next</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </PaginationControl>
      </nav>
    </div>
  )
}
