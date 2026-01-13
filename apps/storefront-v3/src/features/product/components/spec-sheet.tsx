export interface SpecItem {
  label: string
  value: string | number
  unit?: string
}

interface SpecSheetProps {
  specs: SpecItem[]
}

export function SpecSheet({ specs }: SpecSheetProps) {
  if (!specs || specs.length === 0) return null

  return (
    <div className="rounded-sm border bg-card">
      <div className="border-b bg-muted/50 px-4 py-2">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Technical_Specifications
        </h3>
      </div>
      <div className="divide-y">
        {specs.map((spec, index) => (
          <div key={index} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="font-medium text-muted-foreground">{spec.label}</span>
            <span className="font-mono font-semibold text-foreground">
              {spec.value}
              {spec.unit && <span className="ml-1 text-muted-foreground">{spec.unit}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
