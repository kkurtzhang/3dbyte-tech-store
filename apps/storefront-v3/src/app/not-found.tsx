import Link from "next/link"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/features/search/components/search-input"
import { 
  Home, 
  Package, 
  Tags, 
  Store, 
  Layers,
  ArrowLeft,
  Search
} from "lucide-react"

export default function NotFound() {
  // Navigation suggestions
  const navigationLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/products", label: "All Products", icon: Package },
    { href: "/categories", label: "Categories", icon: Tags },
    { href: "/brands", label: "Brands", icon: Store },
    { href: "/collections", label: "Collections", icon: Layers },
  ]

  return (
    <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center px-4 py-16">
      <div className="mx-auto max-w-2xl w-full">
        {/* Error Code with Visual */}
        <div className="relative mb-8 text-center">
          <div className="absolute inset-0 flex items-center justify-center opacity-5">
            <Search className="h-48 w-48" />
          </div>
          <h1 className="text-8xl md:text-9xl font-bold tracking-tighter text-foreground relative">
            404
          </h1>
          <p className="mt-2 font-mono text-sm text-muted-foreground uppercase tracking-widest">
            Page Not Found
          </p>
        </div>

        {/* Main Message */}
        <div className="text-center mb-10">
          <h2 className="text-2xl font-semibold text-foreground mb-3">
            We couldn't find what you're looking for
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved. 
            Try searching or explore our popular pages below.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-10 flex justify-center">
          <div className="w-full max-w-md">
            <Suspense fallback={<SearchPlaceholder />}>
              <SearchInput />
            </Suspense>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
          <Button asChild size="lg" className="font-mono">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="font-mono">
            <Link href="/products">
              <Package className="mr-2 h-4 w-4" />
              Browse Products
            </Link>
          </Button>
        </div>

        {/* Navigation Suggestions */}
        <div className="border-t pt-8">
          <p className="text-center font-mono text-xs text-muted-foreground uppercase tracking-widest mb-6">
            Explore Our Site
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {navigationLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-card hover:bg-accent hover:border-accent transition-all group"
              >
                <link.icon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-sm font-medium">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">
            Need help?{" "}
            <Link 
              href="/contact" 
              className="text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              Contact us <ArrowLeft className="h-3 w-3 rotate-45" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function SearchPlaceholder() {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        placeholder="Search..."
        disabled
        className="w-full rounded-md border border-input bg-background px-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  )
}
