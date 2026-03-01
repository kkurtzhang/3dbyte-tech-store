"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  AlertTriangle, 
  Home, 
  RefreshCw,
  Mail 
} from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global error:", error)
  }, [error])

  return (
    <html>
      <body className="min-h-screen bg-background">
        <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center px-4 py-16">
          <div className="mx-auto max-w-2xl w-full">
            {/* Error Visual */}
            <div className="relative mb-8 text-center">
              <div className="absolute inset-0 flex items-center justify-center opacity-5">
                <AlertTriangle className="h-48 w-48" />
              </div>
              <h1 className="text-8xl md:text-9xl font-bold tracking-tighter text-foreground relative">
                Error
              </h1>
              <p className="mt-2 font-mono text-sm text-muted-foreground uppercase tracking-widest">
                Something Went Wrong
              </p>
            </div>

            {/* Main Message */}
            <div className="text-center mb-10">
              <h2 className="text-2xl font-semibold text-foreground mb-3">
                We're sorry, something unexpected happened
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                An unexpected error occurred. Please try again or return to the homepage.
              </p>
              {error.digest && (
                <p className="mt-4 text-xs font-mono text-muted-foreground">
                  Error ID: {error.digest}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
              <Button 
                onClick={reset}
                size="lg"
                className="font-mono"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button asChild variant="outline" size="lg" className="font-mono">
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Link>
              </Button>
            </div>

            {/* Contact Support */}
            <div className="border-t pt-8">
              <p className="text-center font-mono text-xs text-muted-foreground uppercase tracking-widest mb-6">
                Still Having Issues?
              </p>
              <div className="flex justify-center">
                <Link
                  href="/contact"
                  className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent hover:border-accent transition-all group"
                >
                  <Mail className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <div className="text-left">
                    <span className="text-sm font-medium block">Contact Support</span>
                    <span className="text-xs text-muted-foreground">Get help from our team</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
