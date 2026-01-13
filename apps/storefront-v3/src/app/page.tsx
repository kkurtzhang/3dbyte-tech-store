import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="container py-10">
      <section className="mx-auto flex max-w-[980px] flex-col items-start gap-2 py-8 md:py-12 md:pb-8 lg:py-24 lg:pb-20">
        <h1 className="text-3xl font-bold leading-tight tracking-tighter md:text-6xl lg:leading-[1.1]">
          Engineered for <span className="text-primary">Precision</span>.
        </h1>
        <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl font-mono">
          [ VORON KITS ] [ HIGH-PERF FILAMENTS ] [ HARDWARE ]
        </p>
        <div className="flex w-full items-center justify-start gap-2 py-2">
          <Button size="lg" className="rounded-sm font-mono text-sm">
            BROWSE_CATALOG
          </Button>
          <Button size="lg" variant="outline" className="rounded-sm font-mono text-sm">
            VIEW_SPECS
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {/* Placeholder for Product Cards */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="group relative overflow-hidden rounded-sm border bg-background p-4 hover:border-primary/50 transition-colors">
            <div className="aspect-square bg-secondary/10 mb-4 flex items-center justify-center text-muted-foreground font-mono text-xs">
              IMG_PLACEHOLDER
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="font-medium leading-none">Voron 2.4 R2 Kit</h3>
              <p className="text-xs text-muted-foreground font-mono">[ 350mm ] [ LDO Motors ]</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-sm font-bold">$1,299.00</span>
                <button className="text-xs text-primary underline decoration-dashed underline-offset-4">
                  QUICK_VIEW
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
