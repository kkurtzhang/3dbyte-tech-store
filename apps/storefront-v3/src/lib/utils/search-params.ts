const DYNAMIC_OPTION_PREFIX = "options_"

export function parseDynamicOptionParams(
  params: Record<string, string | undefined>
): Record<string, string[]> {
  const options: Record<string, string[]> = {}

  Object.entries(params).forEach(([key, value]) => {
    if (!key.startsWith(DYNAMIC_OPTION_PREFIX) || !value) {
      return
    }

    const optionKey = key.slice(DYNAMIC_OPTION_PREFIX.length)
    const optionValues = value.split(",").filter(Boolean)

    if (optionValues.length > 0) {
      options[optionKey] = optionValues
    }
  })

  return options
}

export function hasDynamicOptionParams(
  params: Record<string, string | undefined>
): boolean {
  return Object.keys(params).some((key) => key.startsWith(DYNAMIC_OPTION_PREFIX))
}

export function copyDynamicOptionParams(
  source: Record<string, string | undefined>,
  target: Record<string, string | undefined>
): void {
  Object.entries(source).forEach(([key, value]) => {
    if (key.startsWith(DYNAMIC_OPTION_PREFIX) && value) {
      target[key] = value
    }
  })
}
