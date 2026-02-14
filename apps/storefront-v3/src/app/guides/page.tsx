import { Metadata } from "next";
import { Search, BookOpen, Wrench, Layers, Printer, Scissors, Thermometer, Zap, Settings, Package, ArrowRight, Clock, Star } from "lucide-react";

export const metadata: Metadata = {
  title: "3D Printing Guides",
  description: "Expert guides on 3D printing, Voron builds, and filament selection for makers and enthusiasts.",
};

export default function GuidesPage() {
  const categories = [
    {
      title: "Voron Builds",
      description: "Complete build guides for Voron 2.4, V0, and Trident printers",
      icon: Printer,
      color: "bg-blue-500/10 text-blue-500",
      guides: [
        "Voron 2.4 Full Build Guide",
        "V0.2 Build Tutorial",
        "Trident Assembly Walkthrough",
        "Afterburner Mod Installation",
      ],
    },
    {
      title: "Filament Selection",
      description: "Choose the right material for your project",
      icon: Layers,
      color: "bg-green-500/10 text-green-500",
      guides: [
        "PLA vs PETG vs ABS Comparison",
        "Best Filaments for Functional Parts",
        "TPU Printing Tips",
        "Carbon Fiber Reinforced Filaments",
      ],
    },
    {
      title: "Printer Calibration",
      description: "Optimize your prints with proper calibration",
      icon: Settings,
      color: "bg-purple-500/10 text-purple-500",
      guides: [
        "First Layer Calibration Guide",
        "Pressure Advance Tuning",
        "Retraction Settings Explained",
        "PID Autotune Tutorial",
      ],
    },
    {
      title: "Print Troubleshooting",
      description: "Solve common 3D printing problems",
      icon: Wrench,
      color: "bg-orange-500/10 text-orange-500",
      guides: [
        "Layer Shifting Solutions",
        "Stringing and Oozing Fixes",
        "Warping Prevention Tips",
        "Bridge Quality Improvement",
      ],
    },
    {
      title: "Bed Adhesion",
      description: "Get your prints to stick every time",
      icon: Thermometer,
      color: "bg-red-500/10 text-red-500",
      guides: [
        "PEI Sheet Care Guide",
        "Bed Temperature Recommendations",
        "Glue Stick Usage Tips",
        "Brim vs Raft When to Use",
      ],
    },
    {
      title: "Post-Processing",
      description: "Finish your prints like a pro",
      icon: Scissors,
      color: "bg-yellow-500/10 text-yellow-500",
      guides: [
        "Sanding and Painting Tips",
        "Epoxy Coating Guide",
        "Support Removal Techniques",
        "Vapor Smoothing PLA",
      ],
    },
  ];

  const featuredGuides = [
    {
      title: "Complete Voron 2.4 Build Guide",
      category: "Voron Builds",
      readTime: "4 hours",
      rating: "4.9",
      image: "printer",
      description: "A comprehensive step-by-step guide to building your own Voron 2.4 3D printer from scratch.",
    },
    {
      title: "Filament Guide: Which Material for Your Project?",
      category: "Filament Selection",
      readTime: "15 min",
      rating: "4.8",
      image: "layers",
      description: "Learn the differences between PLA, PETG, ABS, TPU, and specialty filaments.",
    },
    {
      title: "First Layer Perfect Every Time",
      category: "Calibration",
      readTime: "10 min",
      rating: "4.9",
      image: "settings",
      description: "Master the most important layer in 3D printing with this calibration guide.",
    },
  ];

  const quickLinks = [
    { title: "Getting Started with 3D Printing", icon: Zap },
    { title: "Nozzle Maintenance Guide", icon: Wrench },
    { title: "SD Card Setup for Klipper", icon: Package },
    { title: "Voltage Theory Explained", icon: Thermometer },
  ];

  return (
    <div className="container py-12 md:py-16">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          3D Printing Guides
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Expert tutorials and walkthroughs for building, calibrating, and mastering your 3D printer.
        </p>
      </div>

      {/* Search Section */}
      <div className="mb-16 max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search guides..."
            className="w-full rounded-lg border bg-background pl-12 pr-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Featured Guides */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-8">
          Featured Guides
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredGuides.map((guide) => (
            <div
              key={guide.title}
              className="group rounded-lg border bg-card overflow-hidden hover:border-primary transition-colors cursor-pointer"
            >
              <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <BookOpen className="h-12 w-12 text-primary/60" />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {guide.category}
                  </span>
                </div>
                <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                  {guide.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {guide.description}
                </p>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{guide.readTime}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    <span>{guide.rating}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Guide Categories */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-8">
          Browse by Category
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <div
              key={category.title}
              className="group rounded-lg border bg-card p-6 hover:border-primary transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className={`rounded-lg p-3 ${category.color} group-hover:scale-110 transition-transform`}>
                  <category.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                    {category.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {category.description}
                  </p>
                </div>
              </div>
              <ul className="space-y-2">
                {category.guides.slice(0, 3).map((guide) => (
                  <li key={guide} className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                    {guide}
                  </li>
                ))}
              </ul>
              {category.guides.length > 3 && (
                <div className="mt-4 text-sm text-primary font-medium flex items-center gap-1">
                  View all {category.guides.length} guides
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-8">
          Popular Topics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <a
              key={link.title}
              href="#"
              className="group flex items-center gap-3 p-4 rounded-lg border hover:border-primary transition-colors hover:bg-accent/50"
            >
              <div className="rounded-lg bg-primary/10 p-2 group-hover:bg-primary/20 transition-colors">
                <link.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="font-medium text-sm group-hover:text-primary transition-colors">
                {link.title}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors ml-auto" />
            </a>
          ))}
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 md:p-12">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-semibold mb-4">
            Stay Updated with New Guides
          </h2>
          <p className="text-muted-foreground mb-6">
            Get the latest 3D printing guides, tutorials, and tips delivered to your inbox.
          </p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 rounded-lg border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>

      {/* Quick Links Footer */}
      <section className="mt-16 pt-16 border-t">
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <a href="/help" className="hover:text-primary transition-colors flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            Help Center
          </a>
          <span className="hidden sm:inline">•</span>
          <a href="/faq" className="hover:text-primary transition-colors flex items-center gap-1">
            <Search className="h-4 w-4" />
            FAQ
          </a>
          <span className="hidden sm:inline">•</span>
          <a href="/contact" className="hover:text-primary transition-colors flex items-center gap-1">
            <Wrench className="h-4 w-4" />
            Contact Support
          </a>
        </div>
      </section>
    </div>
  );
}
