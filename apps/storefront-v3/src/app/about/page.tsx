import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAboutUs } from "@/lib/strapi/content";
import { StrapiImage } from "@/lib/strapi/types";

export const metadata: Metadata = {
  title: "About Us - 3DByte Tech",
  description: "Learn about 3DByte Tech and our mission to bring precision 3D printing technology to makers and engineers.",
};

async function getAboutPageData() {
  const response = await getAboutUs();
  return response.data;
}

export default async function AboutPage() {
  const data = await getAboutPageData();

  const bannerImage = data.Banner?.[0];

  return (
    <main className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-muted via-background to-muted py-20 md:py-32">
        <div className="container">
          <div className="mx-auto max-w-4xl text-center">
            <p className="mb-4 font-mono text-sm text-primary">
              {`{ ABOUT_3DBYTE }`}
            </p>
            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl lg:leading-[1.1]">
              Engineering the future of additive manufacturing,{" "}
              <span className="text-primary">one micron at a time.</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl">
              We empower makers, engineers, and innovators with precision 3D printing
              technology, premium Voron kits, and expert support.
            </p>
            {bannerImage && (
              <div className="mx-auto mt-12 max-w-4xl">
                <img
                  src={bannerImage.url}
                  alt={bannerImage.alternativeText || "3DByte Tech Banner"}
                  width={bannerImage.width}
                  height={bannerImage.height}
                  className="rounded-lg shadow-lg"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="container space-y-24 py-12 md:py-16">
        {/* Our Story Timeline */}
        <section>
          <div className="mb-12 text-center">
            <p className="mb-2 font-mono text-sm text-primary">
              {`<TIMELINE />`}
            </p>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Our Story
            </h2>
            <p className="mt-4 text-muted-foreground">
              From a vision to a trusted name in 3D printing
            </p>
          </div>

          <div className="mx-auto max-w-3xl space-y-12">
            {data?.Timeline?.map((milestone, index) => (
              <div
                key={milestone.id}
                className="relative pl-8 md:pl-12"
              >
                {/* Timeline line and dot */}
                <div className="absolute left-0 top-0 flex h-full w-8 flex-col items-center md:left-4 md:w-12">
                  <div className="h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                  {index < (data.Timeline?.length || 0) - 1 && (
                    <div className="flex-1 w-px bg-border" />
                  )}
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

        {/* Team Section */}
        <section>
          <div className="mb-12 text-center">
            <p className="mb-2 font-mono text-sm text-primary">
              {`<TEAM />`}
            </p>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Meet Our Team
            </h2>
            <p className="mt-4 text-muted-foreground">
              The people behind your precision printing journey
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {data?.Team?.map((member) => (
              <Card key={member.id} className="text-center">
                <CardHeader>
                  {member.image ? (
                    <img
                      src={member.image.url}
                      alt={member.image.alternativeText || member.name}
                      width={member.image.width}
                      height={member.image.height}
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
                  {member.bio && (
                    <p className="text-sm text-muted-foreground">{member.bio}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Values Section */}
        <section>
          <div className="mb-12 text-center">
            <p className="mb-2 font-mono text-sm text-primary">
              {`<VALUES />`}
            </p>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Our Values
            </h2>
            <p className="mt-4 text-muted-foreground">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {[
              {
                icon: "⚙️",
                title: "Precision",
                description:
                  "Quality in every detail. From product selection to customer service, we strive for excellence in every interaction.",
              },
              {
                icon: "🤝",
                title: "Community",
                description:
                  "Building together, learning together. We're passionate about supporting the maker community and fostering collaboration.",
              },
              {
                icon: "🚀",
                title: "Innovation",
                description:
                  "Always pushing boundaries. We continuously explore new technologies and techniques to bring you the best in 3D printing.",
              },
              {
                icon: "💬",
                title: "Support",
                description:
                  "Expert help when you need it most. Our team is here to provide guidance, troubleshooting, and technical assistance.",
              },
            ].map((value) => (
              <Card key={value.title}>
                <CardHeader>
                  <div className="mb-2 text-4xl">{value.icon}</div>
                  <CardTitle>{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Call to Action */}
        <section className="rounded-lg border bg-card p-8 md:p-12">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-2 font-mono text-sm text-primary">
              {`[ GET_STARTED ]`}
            </p>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Ready to Start Your Journey?
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Explore our catalog of precision 3D printers, premium kits, and
              high-performance filaments. Or reach out to our team for expert guidance.
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
  );
}
