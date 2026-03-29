import Link from "next/link"
import { ArrowRight, type LucideIcon } from "lucide-react"

interface ContentPageLink {
  title: string
  description: string
  href: string
  icon: LucideIcon
}

interface ContentPageShellProps {
  eyebrow: string
  title: string
  description: string
  links: ContentPageLink[]
  children: React.ReactNode
}

export function ContentPageShell({
  eyebrow,
  title,
  description,
  links,
  children,
}: ContentPageShellProps) {
  return (
    <div className="container max-w-5xl py-12 md:py-16">
      <section className="rounded-[1.75rem] border border-border/70 bg-card/70 p-6 shadow-sm backdrop-blur md:p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
          {eyebrow}
        </p>
        <div className="mt-4 max-w-3xl space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
          <p className="text-base leading-7 text-muted-foreground md:text-lg">
            {description}
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-2xl border border-border/70 bg-background/80 p-4 transition-colors hover:border-primary/40 hover:bg-background"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="rounded-xl bg-primary/10 p-3 text-primary">
                  <link.icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-foreground">
                {link.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {link.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-[1.5rem] border border-border/70 bg-background p-6 md:p-8">
        {children}
      </section>
    </div>
  )
}
