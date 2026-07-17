import { cn } from "@/lib/utils";
import { MobileFilterDrawer } from "./mobile-filter-drawer";
import type { ReactNode } from "react";

interface ListingLayoutProps {
  children: ReactNode;
  className?: string;
  sidebar?: ReactNode;
  header?: ReactNode;
  mobileFilterResetUrl?: string;
}

export function ListingLayout({
  children,
  className,
  sidebar,
  header,
  mobileFilterResetUrl = "/shop",
}: ListingLayoutProps) {
  return (
    <div className={cn("container mx-auto px-4 py-8", className)}>
      {header && <div className="mb-8">{header}</div>}

      <div
        className={cn(
          "grid grid-cols-1 gap-8",
          sidebar && "lg:grid-cols-[250px_1fr]"
        )}
      >
        {sidebar && (
          <aside className="hidden lg:block">
            <div className="sticky top-20">{sidebar}</div>
          </aside>
        )}

        <div className="space-y-8 min-w-0">
          {sidebar && (
            <MobileFilterDrawer resetUrl={mobileFilterResetUrl}>
              {sidebar}
            </MobileFilterDrawer>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}
