"use client";

import { useActionState } from "react";
import { claimProductSerialAction } from "@/app/actions/product-files";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProductRegistrationForm() {
  const [state, formAction, isPending] = useActionState(
    claimProductSerialAction,
    null,
  );

  return (
    <form action={formAction} className="rounded-sm border p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="medusa_product_id">Product ID</Label>
          <Input
            id="medusa_product_id"
            name="medusa_product_id"
            placeholder="prod_..."
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="serial_number">Serial number</Label>
          <Input
            id="serial_number"
            name="serial_number"
            placeholder="SN-..."
            required
          />
        </div>
      </div>
      {state ? (
        <p
          className={`mt-3 text-sm ${state.success ? "text-emerald-600" : "text-destructive"}`}
          role="status"
        >
          {state.success
            ? `Registered ${state.registration.serial_number}.`
            : state.error}
        </p>
      ) : null}
      <Button type="submit" className="mt-4" disabled={isPending}>
        {isPending ? "Registering..." : "Register product"}
      </Button>
    </form>
  );
}
