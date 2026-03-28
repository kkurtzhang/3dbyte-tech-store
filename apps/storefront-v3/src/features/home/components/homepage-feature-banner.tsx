import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import type { HomepageHeroBanner } from "@/lib/strapi/types"
import { getHomepageImageProps } from "../lib/homepage-content"

interface HomepageFeatureBannerProps {
  banner: HomepageHeroBanner
}

export function HomepageFeatureBanner({ banner }: HomepageFeatureBannerProps) {
  const imageProps = getHomepageImageProps(banner.Image)
  const ctaText = banner.CTA?.BtnText?.trim()
  const ctaLink = banner.CTA?.BtnLink?.trim() || "/shop"

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-gradient-to-r from-slate-950 to-slate-900 text-white shadow-sm">
      <div className="grid gap-8 p-6 md:p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:items-center lg:p-10">
        <div className="space-y-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">
            {banner.Eyebrow || "SYSTEM UPDATE"}
          </p>
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {banner.Headline}
            </h2>
            {banner.Text ? (
              <p className="max-w-2xl text-sm leading-7 text-white/75 md:text-base">
                {banner.Text}
              </p>
            ) : null}
          </div>

          {ctaText ? (
            <Button
              asChild
              className="rounded-full bg-white px-5 font-mono text-xs tracking-[0.18em] text-slate-950 hover:bg-white/90"
            >
              <Link href={ctaLink}>{ctaText}</Link>
            </Button>
          ) : null}
        </div>

        <div className="relative">
          {imageProps ? (
            <div className="relative aspect-[16/10] overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/5">
              <Image
                alt={imageProps.alt}
                className="object-cover"
                fill
                sizes="(min-width: 1024px) 32vw, 100vw"
                src={imageProps.src}
              />
            </div>
          ) : (
            <div className="flex aspect-[16/10] items-end rounded-[1.25rem] border border-white/10 bg-white/5 p-5">
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/60">
                  FEATURED CAMPAIGN
                </p>
                <p className="mt-2 text-sm text-white/80">
                  Use this section for launches, seasonal promos, or curated category pushes.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
