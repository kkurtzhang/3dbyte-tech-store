import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"

export interface ProductCardProps {
  id: string
  handle: string
  title: string
  thumbnail: string
  price: {
    amount: number
    currency_code: string
  }
  specs?: {
    label: string
    value: string
  }[]
}

export function ProductCard({ id, handle, title, thumbnail, price, specs }: ProductCardProps) {
  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  // "Lab" Aesthetic: Clean borders, mono fonts for data
  return (
    <div className="group relative flex flex-col overflow-hidden border bg-card transition-colors hover:border-primary/50">
      <Link href={`/products/${handle}`} className="relative aspect-square overflow-hidden bg-secondary/20">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-mono text-xs text-muted-foreground">
            NO_IMAGE
          </div>
        )}

        {/* Quick Spec Badge Overlay (Visible on Hover/Always on Mobile) */}
        {specs && specs.length > 0 && (
          <div className="absolute bottom-2 left-2 flex gap-1">
             <span className="bg-background/90 px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground border shadow-sm">
                {specs[0].value}
             </span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2">
          <Link href={`/products/${handle}`} className="line-clamp-2 text-sm font-medium leading-tight group-hover:text-primary transition-colors">
            {title}
          </Link>
        </div>

        <div className="mt-auto flex items-center justify-between">
          <span className="font-mono text-sm font-bold tracking-tight text-foreground">
            {formatPrice(price.amount, price.currency_code)}
          </span>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-primary">
            Quick_View
          </Button>
        </div>
      </div>
    </div>
  )
}
