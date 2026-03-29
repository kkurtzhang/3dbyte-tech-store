import Link from "next/link"

import { Button } from "@/components/ui/button"
import type { HomepageSupportStripView } from "../lib/homepage-content"

interface HomepageSupportStripProps {
  strip: HomepageSupportStripView
}

export function HomepageSupportStrip({ strip }: HomepageSupportStripProps) {
  if (!strip.enabled) {
    return null
  }

  return (
    <section className="rounded-[1.5rem] border border-border/70 bg-secondary/30 px-5 py-6 dark:border-slate-800 dark:bg-slate-900/80 md:px-8 md:py-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {strip.label}
          </p>
          <p className="text-sm leading-7 text-foreground/80 md:text-base">
            {strip.text}
          </p>
        </div>

        <Button asChild variant="outline" className="rounded-full px-5 font-mono text-xs tracking-[0.18em]">
          <Link href={strip.ctaLink}>{strip.ctaText}</Link>
        </Button>
      </div>
    </section>
  )
}
