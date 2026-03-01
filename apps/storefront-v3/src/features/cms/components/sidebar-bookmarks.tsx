"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface SidebarBookmarksProps {
  data: {
    id: string;
    label: string;
  }[];
  className?: string;
}

export function SidebarBookmarks({ data, className }: SidebarBookmarksProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -35% 0px" },
    );

    data.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [data]);

  const scrollToId = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setActiveId(id);
    }
  };

  return (
    <nav className={cn("sticky top-24 hidden md:block", className)}>
      <ul className="space-y-4 border-l pl-4">
        {data.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => scrollToId(item.id)}
              className={cn(
                "text-sm transition-colors hover:text-primary text-left",
                activeId === item.id
                  ? "font-medium text-primary"
                  : "text-muted-foreground",
              )}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
