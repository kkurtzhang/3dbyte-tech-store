import { ShieldCheck } from "lucide-react"

export default function CheckoutLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-12 items-center justify-end">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-xs font-mono uppercase tracking-widest">
              Secure checkout
            </span>
          </div>
        </div>
      </header>
      <main className="container py-8 md:py-12">{children}</main>
    </div>
  )
}
