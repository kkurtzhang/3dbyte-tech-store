"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export interface FilterCheckboxProps {
  id: string
  label: string
  count?: number
  checked: boolean
  onChange: (checked: boolean) => void
}

export function FilterCheckbox({
  id,
  label,
  count,
  checked,
  onChange,
}: FilterCheckboxProps) {
  return (
    <div className="flex items-center space-x-2 py-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="border-primary/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
      />
      <Label
        htmlFor={id}
        className="flex flex-1 cursor-pointer text-sm font-normal"
      >
        <span className="flex-1">{label}</span>
        {count !== undefined && (
          <span className="font-mono text-xs text-muted-foreground">
            ({count})
          </span>
        )}
      </Label>
    </div>
  )
}
