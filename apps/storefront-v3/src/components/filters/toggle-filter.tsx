"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export interface ToggleFilterProps {
  id: string
  label: string
  count?: number
  checked: boolean
  onChange: (checked: boolean) => void
}

export function ToggleFilter({
  id,
  label,
  count,
  checked,
  onChange,
}: ToggleFilterProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <Label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm font-normal">
        <span>{label}</span>
        {count !== undefined && (
          <span className="font-mono text-xs text-muted-foreground">
            ({count})
          </span>
        )}
      </Label>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="border-primary/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
      />
    </div>
  )
}
