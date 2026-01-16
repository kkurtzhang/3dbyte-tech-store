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
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

interface SearchCommandDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SearchCommandDialog({
  open: controlledOpen,
  onOpenChange,
}: SearchCommandDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const router = useRouter();
  const { setTheme, theme } = useTheme();

  // Use controlled or uncontrolled state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

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

  const handleSelect = React.useCallback(
    (callback: () => void) => {
      setOpen(false);
      callback();
    },
    [setOpen]
  );

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Navigation">
            <CommandItem
              onSelect={() =>
                handleSelect(() => {
                  router.push("/cart");
                })
              }
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              <span>Go to Cart</span>
            </CommandItem>
            <CommandItem
              onSelect={() =>
                handleSelect(() => {
                  router.push("/account");
                })
              }
            >
              <User className="mr-2 h-4 w-4" />
              <span>Go to Profile</span>
            </CommandItem>
            <CommandItem
              onSelect={() =>
                handleSelect(() => {
                  setTheme(theme === "light" ? "dark" : "light");
                })
              }
            >
              {theme === "light" ? (
                <Moon className="mr-2 h-4 w-4" />
              ) : (
                <Sun className="mr-2 h-4 w-4" />
              )}
              <span>
                Theme: Toggle {theme === "light" ? "Dark" : "Light"}
              </span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Products">
            <CommandItem disabled>
              <Package className="mr-2 h-4 w-4" />
              <span className="text-neutral-500">
                Search products (coming soon)
              </span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Collections">
            <CommandItem disabled>
              <Tags className="mr-2 h-4 w-4" />
              <span className="text-neutral-500">
                Browse collections (coming soon)
              </span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Brands">
            <CommandItem disabled>
              <Store className="mr-2 h-4 w-4" />
              <span className="text-neutral-500">
                Explore brands (coming soon)
              </span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
