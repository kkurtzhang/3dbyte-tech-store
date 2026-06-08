import Image from "next/image"
import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getAboutUs } from "@/lib/strapi/content"
import { resolveStrapiMediaUrl } from "@/lib/strapi/media"

import type { AboutUsData, ContentSection, StrapiImage, Tile } from "@/lib/strapi/types"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "About Us - 3DByte Tech",
  description:
    "Learn about 3DByte Tech and our mission to bring precision 3D printing technology to makers and engineers.",
}

const fallbackValues: Tile[] = [
  {
    id: 1,
    Title: "Precision",
    Text: "Quality in every detail, from product selection to customer service.",
  },
  {
    id: 2,
    Title: "Practical Support",
    Text: "Practical help for makers, engineers, and teams building real printers.",
  },
  {
    id: 3,
    Title: "Reliability",
    Text: "Dependable components, clear information, and support after purchase.",
  },
  {
    id: 4,
    Title: "Curiosity",
    Text: "We keep learning from real build problems and improve as the craft evolves.",
  },
]

async function getAboutPageData(): Promise<AboutUsData | null> {
  try {
    const response = await getAboutUs()

    return response.data
  } catch {
    return null
  }
}

function hasContent(section?: ContentSection | null) {
  return Boolean(section?.Title?.trim() && section.Text?.trim())
}

function imageUrl(image?: StrapiImage | null) {
  return resolveStrapiMediaUrl(image?.url)
}

function SectionImage({
  image,
  fallbackAlt,
  className = "rounded-lg object-cover",
}: {
  image?: StrapiImage | null
  fallbackAlt: string
  className?: string
}) {
  const src = imageUrl(image)

  if (!src || !image) {
    return null
  }

  return (
    <Image
      src={src}
      alt={image.alternativeText || fallbackAlt}
      width={image.width}
      height={image.height}
      className={className}
    />
  )
}

export default async function AboutPage() {
  const data = await getAboutPageData()
  const bannerImage = data?.Banner?.[0]
  const timeline = data?.Timeline ?? []
  const team = data?.Team ?? []
  const valueSectionTitle = data?.WhyUs?.Title?.trim() || "Our Values"
  const valueTiles = data?.WhyUs?.Tile?.length ? data.WhyUs.Tile : fallbackValues
  const numbers = data?.Numbers ?? []

  return (
    <main className="flex flex-col">
      <section className="relative overflow-hidden bg-muted/30 py-20 md:py-28">
        <div className="container">
          <div className="mx-auto max-w-4xl text-center">
            <p className="mb-4 font-mono text-sm uppercase tracking-[0.2em] text-primary">
              About 3DByte
            </p>
            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl lg:leading-[1.1]">
              Engineering the future of additive manufacturing,{" "}
              <span className="text-primary">one micron at a time.</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl">
              We help builders source curated 3D printing components, practical
              materials, and technical support for precise, repeatable work.
            </p>
            {bannerImage ? (
              <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-lg border bg-background shadow-sm">
                <SectionImage
                  image={bannerImage}
                  fallbackAlt="3DByte Tech workshop banner"
                  className="h-auto w-full object-cover"
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="container space-y-20 py-12 md:py-16">
        {numbers.length > 0 ? (
          <section className="grid gap-4 md:grid-cols-3">
            {numbers.map((item) => (
              <div key={item.id} className="rounded-lg border bg-card p-6 text-center">
                <p className="text-3xl font-bold text-primary md:text-4xl">
                  {item.Title}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.Text}
                </p>
              </div>
            ))}
          </section>
        ) : null}

        {hasContent(data?.OurStory) ? (
          <section className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] md:items-center">
            <div>
              <p className="mb-2 font-mono text-sm uppercase tracking-[0.2em] text-primary">
                Story
              </p>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                {data?.OurStory.Title}
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground md:text-lg">
                {data?.OurStory.Text}
              </p>
            </div>
            <SectionImage
              image={data?.OurStory.Image}
              fallbackAlt={data?.OurStory.Title || "3DByte Tech story"}
              className="aspect-[4/3] w-full rounded-lg object-cover"
            />
          </section>
        ) : null}

        <section>
          <div className="mb-10 text-center">
            <p className="mb-2 font-mono text-sm uppercase tracking-[0.2em] text-primary">
              Why Us
            </p>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              {valueSectionTitle}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {valueTiles.map((value) => (
              <Card key={value.id}>
                <CardHeader>
                  <CardTitle>{value.Title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {value.Image ? (
                    <SectionImage
                      image={value.Image}
                      fallbackAlt={value.Title}
                      className="aspect-[16/9] w-full rounded-md object-cover"
                    />
                  ) : null}
                  <p className="text-muted-foreground">{value.Text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {hasContent(data?.OurCraftsmanship) ? (
          <section className="grid gap-8 md:grid-cols-[minmax(280px,420px)_minmax(0,1fr)] md:items-center">
            <SectionImage
              image={data?.OurCraftsmanship?.Image}
              fallbackAlt={data?.OurCraftsmanship?.Title || "3DByte Tech craftsmanship"}
              className="aspect-[4/3] w-full rounded-lg object-cover"
            />
            <div>
              <p className="mb-2 font-mono text-sm uppercase tracking-[0.2em] text-primary">
                Craftsmanship
              </p>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                {data?.OurCraftsmanship?.Title}
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground md:text-lg">
                {data?.OurCraftsmanship?.Text}
              </p>
            </div>
          </section>
        ) : null}

        {timeline.length > 0 ? (
          <section>
            <div className="mb-12 text-center">
              <p className="mb-2 font-mono text-sm uppercase tracking-[0.2em] text-primary">
                Timeline
              </p>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Our Story
              </h2>
              <p className="mt-4 text-muted-foreground">
                From a vision to a trusted name in 3D printing
              </p>
            </div>

            <div className="mx-auto max-w-3xl space-y-12">
              {timeline.map((milestone, index) => (
                <div key={milestone.id} className="relative pl-8 md:pl-12">
                  <div className="absolute left-0 top-0 flex h-full w-8 flex-col items-center md:left-4 md:w-12">
                    <div className="h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                    {index < timeline.length - 1 ? (
                      <div className="w-px flex-1 bg-border" />
                    ) : null}
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-4">
                        <span className="font-mono text-2xl text-primary">
                          {milestone.year}
                        </span>
                        <span className="text-xl md:text-2xl">{milestone.title}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{milestone.description}</p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {team.length > 0 ? (
          <section>
            <div className="mb-12 text-center">
              <p className="mb-2 font-mono text-sm uppercase tracking-[0.2em] text-primary">
                Team
              </p>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Meet Our Team
              </h2>
              <p className="mt-4 text-muted-foreground">
                The people behind your precision printing journey
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {team.map((member) => (
                <Card key={member.id} className="text-center">
                  <CardHeader>
                    {member.image ? (
                      <SectionImage
                        image={member.image}
                        fallbackAlt={member.name}
                        className="mx-auto mb-4 h-24 w-24 rounded-full object-cover"
                      />
                    ) : (
                      <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-4xl font-bold text-primary">
                        {member.name.charAt(0)}
                      </div>
                    )}
                    <CardTitle className="text-lg">{member.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-2 text-sm font-semibold text-primary">{member.role}</p>
                    {member.bio ? (
                      <p className="text-sm text-muted-foreground">{member.bio}</p>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-lg border bg-card p-8 md:p-12">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-2 font-mono text-sm uppercase tracking-[0.2em] text-primary">
              Get Started
            </p>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Ready to Build With Better Parts?
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Explore precision components, practical materials, and workshop-ready
              accessories, or reach out for guidance before your next build.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="font-mono">
                <Link href="/search">Browse Products</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="font-mono">
                <Link href="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
