import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { HomepageHeroBanner, HomepageStat } from "@/lib/strapi/types"
import { getHomepageImageProps } from "../lib/homepage-content"

interface HomepageHeroProps {
  hero: HomepageHeroBanner
  trustStats: HomepageStat[]
}

export function HomepageHero({ hero, trustStats }: HomepageHeroProps) {
  const imageProps = getHomepageImageProps(hero.Image)
  const featureTags =
    hero.FeatureTags?.map((tag) => tag.Text).filter(Boolean) || []
  const primaryCta = {
    text: hero.CTA?.BtnText?.trim() || "Browse Catalog",
    link: hero.CTA?.BtnLink?.trim() || "/shop",
  }
  const secondaryCta = {
    text: hero.SecondaryCTA?.BtnText?.trim() || "Shop Brands",
    link: hero.SecondaryCTA?.BtnLink?.trim() || "/brands",
  }

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-gradient-to-br from-background via-muted/20 to-secondary/20 shadow-sm dark:border-slate-800/80 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 md:px-10 md:py-12 lg:px-14 lg:py-14 px-6 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(250,204,21,0.12),_transparent_35%),linear-gradient(to_right,_rgba(148,163,184,0.08)_1px,_transparent_1px),linear-gradient(to_bottom,_rgba(148,163,184,0.08)_1px,_transparent_1px)] bg-[size:auto,28px_28px,28px_28px] dark:bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.14),_transparent_30%),linear-gradient(to_right,_rgba(148,163,184,0.06)_1px,_transparent_1px),linear-gradient(to_bottom,_rgba(148,163,184,0.06)_1px,_transparent_1px)]" />

      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] lg:items-center">
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="font-mono text-xs tracking-[0.24em] text-muted-foreground">
              {hero.Eyebrow || "3D BYTE THE LAB"}
            </p>
            <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl lg:leading-[1.02]">
              {hero.Headline}
            </h1>
            {hero.Text && (
              <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                {hero.Text}
              </p>
            )}
          </div>

          {featureTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {featureTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border/70 bg-background/80 px-3 py-1.5 font-mono text-[11px] tracking-[0.18em] text-muted-foreground dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="rounded-full border border-cyan-400/80 bg-cyan-400 px-6 font-mono text-xs tracking-[0.18em] text-slate-950 shadow-[0_0_32px_rgba(34,211,238,0.18)] hover:bg-cyan-300 hover:text-slate-950 dark:border-cyan-400/80 dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300 dark:hover:text-slate-950"
            >
              <Link href={primaryCta.link}>{primaryCta.text}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-slate-700 bg-slate-950/70 px-6 font-mono text-xs tracking-[0.18em] text-slate-100 hover:bg-slate-900 hover:text-slate-100 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:hover:bg-slate-900 dark:hover:text-slate-100"
            >
              <Link href={secondaryCta.link}>{secondaryCta.text}</Link>
            </Button>
          </div>

          {trustStats.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3 xl:max-w-3xl xl:grid-cols-4">
              {trustStats.map((stat) => (
                <div
                  key={stat.id}
                  className="rounded-2xl border border-border/70 bg-background/85 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/75"
                >
                  <div className="font-mono text-xl font-bold text-foreground">
                    {stat.Value}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {stat.Label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <div className="rounded-[1.75rem] border border-border/70 bg-card/90 p-3 shadow-xl dark:border-slate-800 dark:bg-slate-950/85">
            {imageProps ? (
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.35rem] bg-muted dark:bg-slate-900">
                <Image
                  alt={imageProps.alt}
                  className="object-cover"
                  fill
                  priority
                  sizes="(min-width: 1024px) 42vw, 100vw"
                  src={imageProps.src}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
              </div>
            ) : (
              <div className="flex aspect-[4/5] items-end rounded-[1.35rem] bg-gradient-to-br from-primary/15 via-secondary/20 to-muted p-6 dark:from-cyan-500/15 dark:via-slate-900 dark:to-slate-800">
                <div className="space-y-3 rounded-2xl border border-border/70 bg-background/90 p-5 backdrop-blur dark:border-slate-700 dark:bg-slate-950/85">
                  <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground dark:text-slate-400">
                    CURATED STOREFRONT
                  </p>
                  <p className="text-lg font-semibold text-foreground dark:text-slate-100">
                    Better rails, fewer dead ends, clearer buying paths.
                  </p>
                </div>
              </div>
            )}

            <div className="absolute bottom-8 left-8 right-8 flex flex-col gap-3 sm:flex-row">
              <div className="flex-1 rounded-2xl border border-white/15 bg-slate-950/80 px-4 py-3 text-white backdrop-blur">
                <p className="font-mono text-[11px] tracking-[0.18em] text-white/70">
                  CURATED ENTRY POINTS
                </p>
                <p className="mt-2 text-sm leading-6 text-white/90">
                  Jump into collections, products, guides, and trusted brands without losing the thread.
                </p>
              </div>
              <Link
                className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/90 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-background dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100 dark:hover:bg-slate-900"
                href="/collections"
              >
                View collections
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
