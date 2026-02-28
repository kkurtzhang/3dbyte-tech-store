"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ShoppingCart,
  User,
  Sun,
  Moon,
  Package,
  Store,
  Folder,
  Search,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";

// Helper component to highlight matching text
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) {
    return <>{text}</>;
  }

  const regex = new RegExp(`(${escapeRegExp(query)})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-transparent font-semibold text-foreground">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

import { searchAll, type ProductHit, type CategoryHit, type BrandHit } from "@/features/search/actions/unified-search";

interface SearchCommandDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SearchCommandDialog({
  open: controlledOpen,
  onOpenChange,
}: SearchCommandDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [products, setProducts] = React.useState<ProductHit[]>([]);
  const [categories, setCategories] = React.useState<CategoryHit[]>([]);
  const [brands, setBrands] = React.useState<BrandHit[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const selectionLockRef = React.useRef(false);

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  React.useEffect(() => {
    if (open) {
      const timeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timeout);
    } else {
      setSearchQuery("");
      setProducts([]);
      setCategories([]);
      setBrands([]);
      setActiveIndex(0);
    }
  }, [open]);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, setOpen]);

  const performSearch = React.useCallback(async (query: string) => {
    if (!query.trim()) {
      setProducts([]);
      setCategories([]);
      setBrands([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const result = await searchAll(query);
      setProducts(result.products);
      setCategories(result.categories);
      setBrands(result.brands);
    } catch (error) {
      console.error("Search error:", error);
      setProducts([]);
      setCategories([]);
      setBrands([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setActiveIndex(0);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 200);
  };

  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleSelect = React.useCallback(
    (callback: () => void) => {
      if (selectionLockRef.current) return;
      selectionLockRef.current = true;
      setOpen(false);
      callback();
      setTimeout(() => {
        selectionLockRef.current = false;
      }, 0);
    },
    [setOpen],
  );

  const hasResults = products.length > 0 || categories.length > 0 || brands.length > 0;

  const exploreItems = React.useMemo(() => {
    const items: Array<{
      id: string;
      label: string;
      type: "category" | "brand";
      subLabel?: string;
      onSelect: () => void;
    }> = [];
    categories.forEach((category) => {
      const handle = category.handle;
      items.push({
        id: `category:${category.id}`,
        label: category.name,
        type: "category",
        subLabel: category.product_count !== undefined ? `${category.product_count} products` : undefined,
        onSelect: () => {
          router.push(`/categories/${Array.isArray(handle) ? handle.join("/") : handle}`);
        },
      });
    });
    brands.forEach((brand) => {
      items.push({
        id: `brand:${brand.id}`,
        label: brand.name,
        type: "brand",
        subLabel: brand.product_count !== undefined ? `${brand.product_count} products` : undefined,
        onSelect: () => {
          router.push(`/brands/${brand.handle}`);
        },
      });
    });
    return items;
  }, [brands, categories, router]);

  const productItems = React.useMemo(() => {
    return products.map((product) => {
      const price = product.price ? `$${product.price.toFixed(2)}` : undefined;
      const specs =
        product.specs && (product.specs.material || product.specs.diameter)
          ? `${product.specs.material ?? ""}${product.specs.material && product.specs.diameter ? " • " : ""}${product.specs.diameter ?? ""}`
          : undefined;
      return {
        id: `product:${product.id}`,
        label: product.title,
        type: "product" as const,
        subLabel: specs,
        trailing: price,
        onSelect: () => {
          router.push(`/products/${product.handle}`);
        },
      };
    });
  }, [products, router]);

  const flattenedItems = React.useMemo(() => {
    const items: Array<{
      id: string;
      onSelect: () => void;
    }> = [];
    exploreItems.forEach((item) => items.push({ id: item.id, onSelect: item.onSelect }));
    productItems.forEach((item) => items.push({ id: item.id, onSelect: item.onSelect }));
    if (searchQuery.trim()) {
      items.push({
        id: "search-all",
        onSelect: () => {
          router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        },
      });
    }
    return items;
  }, [exploreItems, productItems, router, searchQuery]);

  React.useEffect(() => {
    if (activeIndex >= flattenedItems.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, flattenedItems.length]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!flattenedItems.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % flattenedItems.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + flattenedItems.length) % flattenedItems.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = flattenedItems[activeIndex];
      if (item) {
        handleSelect(item.onSelect);
      }
    }
  };

  return (
    <>
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[60] w-[min(980px,94vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border/70 bg-background shadow-2xl">
            <DialogPrimitive.Title className="sr-only">Search</DialogPrimitive.Title>
            <div className="border-b border-border/70 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                  <Search className="h-4 w-4" />
                </div>
                <Input
                  ref={inputRef}
                  placeholder="Search products, categories, brands..."
                  value={searchQuery}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-10 border-0 bg-transparent px-0 font-mono text-base tracking-tight placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <div className="ml-auto hidden items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/70 md:flex">
                  <span className="rounded border border-border/70 px-2 py-1">⌘</span>
                  <span>K</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => handleSelect(() => router.push("/cart"))}
                  className="flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground transition-colors hover:bg-muted"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  <span>Cart</span>
                </button>
                <button
                  onClick={() => handleSelect(() => router.push("/account"))}
                  className="flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground transition-colors hover:bg-muted"
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Profile</span>
                </button>
                <button
                  onClick={() => handleSelect(() => router.push("/brands"))}
                  className="flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground transition-colors hover:bg-muted"
                >
                  <Store className="h-3.5 w-3.5" />
                  <span>All Brands</span>
                </button>
                <button
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                  className="flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground transition-colors hover:bg-muted"
                >
                  {theme === "light" ? (
                    <Moon className="h-3.5 w-3.5" />
                  ) : (
                    <Sun className="h-3.5 w-3.5" />
                  )}
                  <span>Theme</span>
                </button>
              </div>
            </div>

            <div className="max-h-[68vh] overflow-y-auto px-5 py-4">
              {isSearching ? (
                <div className="flex items-center gap-2 px-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </div>
              ) : hasResults ? (
                <>
                  {exploreItems.length > 0 && (
                    <div className="mb-4">
                      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        <span className="h-px w-8 bg-border/70" />
                        Explore
                      </div>
                      <div className="grid gap-1 sm:grid-cols-2">
                        {exploreItems.map((item, index) => {
                          const globalIndex = index;
                          const isActive = activeIndex === globalIndex;
                          return (
                            <button
                              key={item.id}
                              onMouseMove={() => setActiveIndex(globalIndex)}
                              onClick={() => handleSelect(item.onSelect)}
                              className={`flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors ${
                                isActive
                                  ? "border-primary/40 bg-primary/10 text-foreground"
                                  : "hover:border-border/70 hover:bg-muted/60"
                              }`}
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-muted/60">
                                {item.type === "category" ? (
                                  <Folder className="h-4 w-4 shrink-0" />
                                ) : (
                                  <Store className="h-4 w-4 shrink-0" />
                                )}
                              </div>
                              <div className="flex min-w-0 flex-1 flex-col">
                                <span className="truncate text-sm font-semibold">
                                  <HighlightText text={item.label} query={searchQuery} />
                                </span>
                                {item.subLabel && (
                                  <span className="text-xs text-muted-foreground">{item.subLabel}</span>
                                )}
                              </div>
                              <span className="rounded-full border border-border/70 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                                {item.type}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {productItems.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        <span className="h-px w-8 bg-border/70" />
                        Products
                      </div>
                      <div className="grid gap-1">
                        {productItems.map((product, index) => {
                          const globalIndex = exploreItems.length + index;
                          const isActive = activeIndex === globalIndex;
                          return (
                            <button
                              key={product.id}
                              onMouseMove={() => setActiveIndex(globalIndex)}
                              onClick={() => handleSelect(product.onSelect)}
                              className={`flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors ${
                                isActive
                                  ? "border-primary/40 bg-primary/10 text-foreground"
                                  : "hover:border-border/70 hover:bg-muted/60"
                              }`}
                            >
                              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border/70 bg-muted/60">
                                <Package className="h-4 w-4 shrink-0" />
                              </div>
                              <div className="flex min-w-0 flex-1 flex-col">
                                <span className="truncate text-sm font-semibold">
                                  <HighlightText text={product.label} query={searchQuery} />
                                </span>
                                {product.subLabel && (
                                  <span className="text-xs text-muted-foreground truncate">
                                    {product.subLabel}
                                  </span>
                                )}
                              </div>
                              {product.trailing && (
                                <span className="text-sm font-semibold text-primary">{product.trailing}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {searchQuery
                    ? `No results found for "${searchQuery}". Try a different term.`
                    : "Start typing to search products, categories, and brands..."}
                </div>
              )}

              {searchQuery.trim() && (
                <button
                  onMouseMove={() => setActiveIndex(flattenedItems.length - 1)}
                  onClick={() => {
                    handleSelect(() => {
                      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
                    });
                  }}
                  className={`mt-5 flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm ${
                    activeIndex === flattenedItems.length - 1
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border/70 hover:bg-muted/60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    <span>Search all results for "{searchQuery}"</span>
                  </div>
                  <span className="rounded border border-border/70 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">↩</span>
                </button>
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
