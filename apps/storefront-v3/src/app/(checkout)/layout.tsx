import Link from "next/link"
import { ShieldCheck } from "lucide-react"

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold">3D Byte</span>
          </Link>
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-xs font-mono uppercase tracking-widest">
              Secure_Channel_Active
            </span>
          </div>
        </div>
      </header>
      <main className="container py-8 md:py-12">{children}</main>
    </div>
  )
}
