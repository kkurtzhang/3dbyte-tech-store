"use client"

import { useState } from "react"
import { ChevronDown, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { AddressForm } from "./address-form"

interface AddressFormPanelProps {
  defaultOpen?: boolean
}

export function AddressFormPanel({
  defaultOpen = false,
}: AddressFormPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <section className="space-y-3">
      <Button
        aria-controls="address-form"
        aria-expanded={isOpen}
        className="w-full font-mono uppercase tracking-widest sm:w-auto"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
        variant={isOpen ? "secondary" : "outline"}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Address
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "ml-2 h-4 w-4 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </Button>

      {isOpen ? (
        <Card id="address-form">
          <CardContent className="p-6">
            <AddressForm title="Add new address" />
          </CardContent>
        </Card>
      ) : null}
    </section>
  )
}
