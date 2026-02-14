"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ShoppingCart,
  User,
  Sun,
  Moon,
  Package,
  Tags,
  Store,
  Folder,
  Search,
  Loader2,
  ArrowRight,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

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
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

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
      setOpen(false);
      callback();
    },
    [setOpen],
  );

  const hasResults = products.length > 0 || categories.length > 0 || brands.length > 0;

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          ref={inputRef as any}
          placeholder="Search products, categories, brands..."
          value={searchQuery}
          onValueChange={handleSearchChange}
        />
        <CommandList>
          <CommandEmpty>
            {searchQuery && !isSearching ? (
              <div className="py-6 text-center">
                <Search className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
                <p className="text-sm text-muted-foreground/60 mt-1">Try a different search term</p>
              </div>
            ) : (
              <div className="py-6 text-center text-muted-foreground">
                Start typing to search products, categories, and brands...
              </div>
            )}
          </CommandEmpty>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 border-b p-3">
            <button
              onClick={() => handleSelect(() => router.push("/cart"))}
              className="flex items-center gap-1.5 rounded-md border bg-accent px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent/80"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>Cart</span>
            </button>
            <button
              onClick={() => handleSelect(() => router.push("/account"))}
              className="flex items-center gap-1.5 rounded-md border bg-accent px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent/80"
            >
              <User className="h-3.5 w-3.5" />
              <span>Profile</span>
            </button>
            <button
              onClick={() => handleSelect(() => router.push("/brands"))}
              className="flex items-center gap-1.5 rounded-md border bg-accent px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent/80"
            >
              <Store className="h-3.5 w-3.5" />
              <span>All Brands</span>
            </button>
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="flex items-center gap-1.5 rounded-md border bg-accent px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent/80"
            >
              {theme === "light" ? (
                <Moon className="h-3.5 w-3.5" />
              ) : (
                <Sun className="h-3.5 w-3.5" />
              )}
              <span>Theme</span>
            </button>
          </div>

          {isSearching ? (
            <CommandItem disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="text-muted-foreground">Searching...</span>
            </CommandItem>
          ) : (
            <>
              {/* Categories */}
              {categories.length > 0 && (
                <CommandGroup heading={`Categories (${categories.length})`}>
                  {categories.map((category) => (
                    <CommandItem
                      key={category.id}
                      value={category.name}
                      onSelect={() => {
                        handleSelect(() => {
                          const handle = category.handle;
                          router.push(`/categories/${Array.isArray(handle) ? handle.join("/") : handle}`);
                        });
                      }}
                    >
                      <Folder className="mr-2 h-4 w-4" />
                      <div className="flex flex-col flex-1">
                        <span>{category.name}</span>
                        {category.product_count !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            {category.product_count} products
                          </span>
                        )}
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Brands */}
              {brands.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading={`Brands (${brands.length})`}>
                    {brands.map((brand) => (
                      <CommandItem
                        key={brand.id}
                        value={brand.name}
                        onSelect={() => {
                          handleSelect(() => {
                            router.push(`/brands/${brand.handle}`);
                          });
                        }}
                      >
                        <Store className="mr-2 h-4 w-4" />
                        <div className="flex flex-col flex-1">
                          <span>{brand.name}</span>
                          {brand.product_count !== undefined && (
                            <span className="text-xs text-muted-foreground">
                              {brand.product_count} products
                            </span>
                          )}
                        </div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* Products */}
              {products.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading={`Products (${products.length})`}>
                    {products.map((product) => (
                      <CommandItem
                        key={product.id}
                        value={product.title}
                        onSelect={() => {
                          handleSelect(() => {
                            router.push(`/products/${product.handle}`);
                          });
                        }}
                      >
                        <Package className="mr-2 h-4 w-4" />
                        <div className="flex flex-col flex-1">
                          <span>{product.title}</span>
                          {product.specs && (
                            <span className="text-xs text-muted-foreground">
                              {product.specs.material} • {product.specs.diameter}
                            </span>
                          )}
                        </div>
                        {product.price && (
                          <span className="text-sm font-medium">
                            ${product.price.toFixed(2)}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* No results but has query */}
              {hasResults === false && searchQuery && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem disabled>
                      <Search className="mr-2 h-4 w-4" />
                      <span className="text-muted-foreground">
                        Try searching for categories or brands instead
                      </span>
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </>
          )}

          <CommandSeparator />

          {/* Search All Link */}
          <CommandGroup>
            <CommandItem
              onSelect={() => {
                handleSelect(() => {
                  router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
                });
              }}
              className="text-muted-foreground"
            >
              <Search className="mr-2 h-4 w-4" />
              <span>Search all results for "{searchQuery}"</span>
              <CommandShortcut>↩</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
