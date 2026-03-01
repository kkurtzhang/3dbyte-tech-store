import { cn } from "@/lib/utils";

interface ListingLayoutProps {
  children: React.ReactNode;
  className?: string;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
}

export function ListingLayout({
  children,
  className,
  sidebar,
  header,
}: ListingLayoutProps) {
  return (
    <div className={cn("container mx-auto px-4 py-8", className)}>
      {header && <div className="mb-8">{header}</div>}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[250px_1fr]">
        {sidebar && (
          <aside className="hidden lg:block">
            <div className="sticky top-20">{sidebar}</div>
          </aside>
        )}

        <div className="space-y-8 min-w-0">
          {sidebar && (
            <details className="lg:hidden">
              <summary className="cursor-pointer font-medium select-none">
                Show Filters
              </summary>
              <div className="mt-4">{sidebar}</div>
            </details>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}
