"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  AlertTriangle, 
  Home, 
  RefreshCw,
  ArrowLeft,
  Mail 
} from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Error:", error)
  }, [error])

  return (
    <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center px-4 py-16">
      <div className="mx-auto max-w-2xl w-full">
        {/* Error Visual */}
        <div className="relative mb-8 text-center">
          <div className="absolute inset-0 flex items-center justify-center opacity-5">
            <AlertTriangle className="h-48 w-48" />
          </div>
          <h1 className="text-8xl md:text-9xl font-bold tracking-tighter text-foreground relative">
            Oops!
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
            An unexpected error occurred. Our team has been notified and is working 
            to fix the issue. In the meantime, you can try again or return home.
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

        {/* Help Options */}
        <div className="border-t pt-8">
          <p className="text-center font-mono text-xs text-muted-foreground uppercase tracking-widest mb-6">
            Need More Help?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <Link
              href="/faq"
              className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent hover:border-accent transition-all group"
            >
              <AlertTriangle className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              <div className="text-left">
                <span className="text-sm font-medium block">FAQ</span>
                <span className="text-xs text-muted-foreground">Common questions answered</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-muted-foreground hover:text-primary font-medium inline-flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Go back to previous page
          </button>
        </div>
      </div>
    </div>
  )
}
