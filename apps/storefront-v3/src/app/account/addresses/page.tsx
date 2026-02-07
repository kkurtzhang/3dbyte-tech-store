import { Metadata } from "next";
import {
  getSessionAction,
  getAddressesAction,
  addAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
  CustomerAddress,
} from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, Trash2, Home } from "lucide-react";

export const metadata: Metadata = {
  title: "Addresses",
  description: "Manage your saved addresses",
};

async function getAddresses(): Promise<CustomerAddress[]> {
  const result = await getAddressesAction();
  if (result.success) {
    return result.addresses;
  }
  return [];
}

export default async function AddressesPage() {
  const session = await getSessionAction();

  if (!session.success) {
    redirect("/sign-in");
  }

  const addresses = await getAddresses();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-semibold uppercase tracking-wider">
            Addresses
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Manage your saved shipping and billing addresses
          </p>
        </div>
      </div>

      {/* Add Address Form */}
      <Card>
        <CardHeader>
          <CardTitle className="font-mono uppercase tracking-wider text-sm">
            Add New Address
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async (formData) => {
              "use server";
              const data = {
                first_name: formData.get("first_name") as string,
                last_name: formData.get("last_name") as string,
                address_1: formData.get("address_1") as string,
                address_2: formData.get("address_2") as string,
                city: formData.get("city") as string,
                country_code: formData.get("country_code") as string,
                postal_code: formData.get("postal_code") as string,
                phone: formData.get("phone") as string,
              };
              await addAddressAction(data);
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input id="first_name" name="first_name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input id="last_name" name="last_name" required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address_1">Address Line 1</Label>
                <Input id="address_1" name="address_1" required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address_2">Address Line 2 (Optional)</Label>
                <Input id="address_2" name="address_2" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input id="postal_code" name="postal_code" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country_code">Country Code</Label>
                <Input
                  id="country_code"
                  name="country_code"
                  placeholder="US"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input id="phone" name="phone" type="tel" />
              </div>
            </div>
            <div className="mt-6">
              <Button
                type="submit"
                className="font-mono uppercase tracking-widest"
              >
                <Plus className="h-4 w-4 mr-2" />
                Save Address
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {addresses.length > 0 && (
        <>
          <h2 className="font-mono text-lg font-semibold uppercase tracking-wider">
            Saved Addresses
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {addresses.map((address) => (
              <Card key={address.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="font-mono uppercase tracking-wider text-sm flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      {address.first_name} {address.last_name}
                    </CardTitle>
                    {address.is_default && (
                      <Badge
                        variant="secondary"
                        className="font-mono text-xs uppercase"
                      >
                        Default
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <address className="text-sm text-muted-foreground not-italic space-y-1">
                    {address.address_1}
                    {address.address_2 && (
                      <>
                        <br />
                        {address.address_2}
                      </>
                    )}
                    <br />
                    {address.city}, {address.postal_code}
                    <br />
                    {address.country_code.toUpperCase()}
                    {address.phone && (
                      <>
                        <br />
                        {address.phone}
                      </>
                    )}
                  </address>

                  <Separator className="my-4" />

                  <div className="flex gap-2">
                    {!address.is_default && (
                      <form
                        action={async () => {
                          "use server";
                          await setDefaultAddressAction(address.id);
                        }}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          type="submit"
                          className="font-mono text-xs uppercase tracking-wider"
                        >
                          Set Default
                        </Button>
                      </form>
                    )}
                    <form
                      action={async () => {
                        "use server";
                        await deleteAddressAction(address.id);
                      }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        type="submit"
                        className="font-mono text-xs uppercase tracking-wider text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
