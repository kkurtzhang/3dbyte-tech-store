// Single filter option with count
export interface FilterOption {
  value: string
  label?: string // Human-readable label (optional, falls back to value)
  count: number
}

// Group of filter options
export interface FilterGroup {
  id: string
  label: string
  options: FilterOption[]
  multiSelect: boolean // true for categories/options, false for brand
}

// Facet data from Meilisearch
export interface FilterFacets {
  categories: FilterOption[] // { value: category_id, count: number }
  brands: FilterOption[] // { value: brand_id, count: number }
  onSale: FilterOption[] // { value: 'true'/'false', count: number }
  inStock: FilterOption[] // { value: 'true'/'false', count: number }
  priceRange: {
    min: number
    max: number
  }
  options: Record<string, FilterOption[]> // { options_colour: [...], options_size: [...] }
}

// Human-readable labels for option keys
export const OPTION_LABELS: Record<string, string> = {
  options_colour: 'Colour',
  options_size: 'Size',
  options_nozzle_type: 'Nozzle Type',
  options_nozzle_size: 'Nozzle Size',
  options_variant: 'Variant',
  options_fitment: 'Fitment',
  options_type: 'Type',
}

// Options to exclude from filter UI
export const EXCLUDED_OPTIONS = ['options_default']

// Helper to format option key for display
export function formatOptionLabel(key: string): string {
  return OPTION_LABELS[key] || key.replace('options_', '').replace(/_/g, ' ')
}
