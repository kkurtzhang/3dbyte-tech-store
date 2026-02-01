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
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Use controlled or uncontrolled state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  // Focus input when dialog opens
  React.useEffect(() => {
    if (open) {
      // Small delay to ensure the dialog has rendered
      const timeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timeout);
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

  const handleSelect = React.useCallback(
    (callback: () => void) => {
      setOpen(false);
      callback();
    },
    [setOpen],
  );

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          ref={inputRef}
          placeholder="Type a command or search..."
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {/* Quick Navigation Badges */}
          <div className="flex flex-wrap gap-2 border-b p-3">
            <button
              onClick={() =>
                handleSelect(() => {
                  router.push("/cart");
                })
              }
              className="flex items-center gap-1.5 rounded-md border bg-accent px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent-hover hover:border-primary/50"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>Cart</span>
            </button>
            <button
              onClick={() =>
                handleSelect(() => {
                  router.push("/account");
                })
              }
              className="flex items-center gap-1.5 rounded-md border bg-accent px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent-hover hover:border-primary/50"
            >
              <User className="h-3.5 w-3.5" />
              <span>Profile</span>
            </button>
            <button
              onClick={() =>
                handleSelect(() => {
                  setTheme(theme === "light" ? "dark" : "light");
                })
              }
              className="flex items-center gap-1.5 rounded-md border bg-accent px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent-hover hover:border-primary/50"
            >
              {theme === "light" ? (
                <Moon className="h-3.5 w-3.5" />
              ) : (
                <Sun className="h-3.5 w-3.5" />
              )}
              <span>Theme</span>
            </button>
          </div>

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
