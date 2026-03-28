import Link from "next/link"

import { Button } from "@/components/ui/button"

interface HomepageSectionHeaderProps {
  eyebrow: string
  heading: string
  text?: string
  ctaText?: string
  ctaLink?: string
}

export function HomepageSectionHeader({
  eyebrow,
  heading,
  text,
  ctaText,
  ctaLink,
}: HomepageSectionHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl space-y-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {eyebrow}
        </p>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {heading}
          </h2>
          {text ? (
            <p className="text-sm leading-7 text-muted-foreground md:text-base">
              {text}
            </p>
          ) : null}
        </div>
      </div>

      {ctaText && ctaLink ? (
        <Button asChild className="rounded-full px-5 font-mono text-xs tracking-[0.18em]">
          <Link href={ctaLink}>{ctaText}</Link>
        </Button>
      ) : null}
    </div>
  )
}
