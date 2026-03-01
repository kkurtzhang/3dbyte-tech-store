"use client"

import { FilterCheckbox } from "./filter-checkbox"
import { FilterSection } from "./filter-section"

export interface FacetOptionsSectionProps {
  title: string
  value: string
  defaultOpen?: boolean
  options: Array<{ value: string; label?: string; count: number }>
  selectedValues: string[]
  onChange: (value: string, checked: boolean) => void
  onClear?: () => void
  onSelectAll?: () => void
  selectedCount?: number
}

export function FacetOptionsSection({
  title,
  value,
  defaultOpen,
  options,
  selectedValues,
  onChange,
  onClear,
  onSelectAll,
  selectedCount,
}: FacetOptionsSectionProps) {
  if (options.length === 0) return null

  return (
    <FilterSection
      title={title}
      value={value}
      defaultOpen={defaultOpen}
      selectedCount={selectedCount}
      onClear={onClear}
      onSelectAll={onSelectAll}
    >
      <div className="space-y-1">
        {options.map((option) => (
          <FilterCheckbox
            key={option.value}
            id={`${value}-${option.value}`}
            label={option.label || option.value}
            count={option.count}
            checked={selectedValues.includes(option.value)}
            onChange={(checked) => onChange(option.value, checked)}
          />
        ))}
      </div>
    </FilterSection>
  )
}
