"use client"

import { useEffect, useId, useRef, useState } from "react"
import type { KeyboardEvent } from "react"
import type { MeilisearchAddressDocument } from "@3dbyte-tech-store/shared-types"

import { Input } from "@/components/ui/input"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { searchAddresses } from "@/lib/search/addresses"
import { cn } from "@/lib/utils"

interface AddressAutocompleteProps {
  // eslint-disable-next-line no-unused-vars
  onSelect: (address: MeilisearchAddressDocument) => void
  // eslint-disable-next-line no-unused-vars
  onValueChange?: (value: string) => void
  defaultValue?: string
  error?: string
  className?: string
  id?: string
}

export function AddressAutocomplete({
  onSelect,
  onValueChange,
  defaultValue = "",
  error,
  className,
  id,
}: AddressAutocompleteProps) {
  const generatedId = useId()
  const inputId = id || `address-autocomplete-${generatedId}`
  const listboxId = `${inputId}-listbox`
  const rootRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState(defaultValue)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<MeilisearchAddressDocument[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    setQuery(defaultValue)
  }, [defaultValue])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [])

  useEffect(() => {
    let isCurrent = true
    const trimmedQuery = debouncedQuery.trim()

    if (trimmedQuery.length < 3) {
      setResults([])
      setIsLoading(false)
      setSelectedIndex(-1)
      return () => {
        isCurrent = false
      }
    }

    setIsLoading(true)
    searchAddresses(trimmedQuery)
      .then((result) => {
        if (!isCurrent) {
          return
        }
        setResults(result.addresses)
        setSelectedIndex(result.addresses.length > 0 ? 0 : -1)
        setIsOpen(true)
      })
      .catch(() => {
        if (!isCurrent) {
          return
        }
        setResults([])
        setSelectedIndex(-1)
        setIsOpen(true)
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [debouncedQuery])

  const handleQueryChange = (value: string) => {
    setQuery(value)
    setIsOpen(value.trim().length >= 3)
    setSelectedIndex(-1)
    onValueChange?.(value)
  }

  const selectAddress = (address: MeilisearchAddressDocument) => {
    setQuery(address.full_address)
    setIsOpen(false)
    setSelectedIndex(-1)
    onValueChange?.(address.full_address)
    onSelect(address)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsOpen(false)
      return
    }

    if (!isOpen || results.length === 0) {
      return
    }

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setSelectedIndex((current) => (current + 1) % results.length)
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      setSelectedIndex((current) =>
        current <= 0 ? results.length - 1 : current - 1
      )
    }

    if (event.key === "Enter" && selectedIndex >= 0) {
      event.preventDefault()
      selectAddress(results[selectedIndex])
    }
  }

  const showDropdown = isOpen && query.trim().length >= 3
  const activeOptionId =
    selectedIndex >= 0 ? `${listboxId}-option-${selectedIndex}` : undefined

  return (
    <div ref={rootRef} className="relative">
      <Input
        id={inputId}
        aria-label="Address"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={showDropdown}
        aria-activedescendant={activeOptionId}
        aria-invalid={Boolean(error)}
        role="combobox"
        autoComplete="street-address"
        placeholder="123 Lab St"
        value={query}
        onChange={(event) => handleQueryChange(event.target.value)}
        onFocus={() => {
          if (query.trim().length >= 3) {
            setIsOpen(true)
          }
        }}
        onKeyDown={handleKeyDown}
        className={className}
      />

      {showDropdown && (
        <div
          id={listboxId}
          role="listbox"
          className={cn(
            "absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-auto rounded-md border bg-popover p-1 text-sm shadow-md"
          )}
        >
          {isLoading && (
            <div className="px-3 py-2 text-muted-foreground">Searching...</div>
          )}

          {!isLoading && results.length === 0 && (
            <div className="px-3 py-2 text-muted-foreground">
              No addresses found
            </div>
          )}

          {!isLoading &&
            results.map((address, index) => (
              <button
                key={address.id}
                id={`${listboxId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={selectedIndex === index}
                className={cn(
                  "flex w-full items-center rounded-sm px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground",
                  selectedIndex === index && "bg-accent text-accent-foreground"
                )}
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={() => selectAddress(address)}
              >
                {address.full_address}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
