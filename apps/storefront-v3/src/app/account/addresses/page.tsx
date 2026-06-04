import { Metadata } from "next"
import Link from "next/link"
import {
  getSessionAction,
  getAddressesAction,
  deleteAddressAction,
  setDefaultAddressAction,
  CustomerAddress,
} from "@/app/actions/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AddressForm } from "@/components/account/address-form"
import { AddressFormPanel } from "@/components/account/address-form-panel"
import { Trash2, Home, Pencil } from "lucide-react"

export const metadata: Metadata = {
  title: "Addresses",
  description: "Manage your saved addresses",
}

async function getAddresses(): Promise<CustomerAddress[]> {
  const result = await getAddressesAction()
  if (result.success) {
    return result.addresses
  }
  return []
}

type AddressesSearchParams = {
  edit?: string
  mode?: string
}

type AddressesPageProps = {
  searchParams?: Promise<AddressesSearchParams> | AddressesSearchParams
}

function addressToFormAddress(address: CustomerAddress) {
  return {
    id: address.id,
    first_name: address.first_name,
    last_name: address.last_name,
    address_1: address.address_1,
    address_2: address.address_2,
    city: address.city,
    province: address.province,
    country_code: address.country_code,
    postal_code: address.postal_code,
    phone: address.phone,
    is_default: address.is_default,
  }
}

export default async function AddressesPage({
  searchParams,
}: AddressesPageProps = {}) {
  const session = await getSessionAction()

  if (!session.success) {
    redirect("/sign-in")
  }

  const addresses = await getAddresses()
  const params = searchParams ? await searchParams : {}
  const isAdding = params.mode === "add"
  const editingAddressId =
    typeof params.edit === "string" ? params.edit : undefined
  const editingAddress = editingAddressId
    ? addresses.find((address) => address.id === editingAddressId)
    : undefined

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-mono text-2xl font-semibold uppercase tracking-wider">
            Addresses
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Manage your saved shipping and billing addresses
          </p>
        </div>
      </div>

      <AddressFormPanel defaultOpen={isAdding} />

      {addresses.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) => {
            const isEditing = editingAddress?.id === address.id

            return (
              <Card
                key={address.id}
                id={isEditing ? "address-form" : undefined}
              >
                {isEditing ? (
                  <CardContent className="p-6">
                    <AddressForm
                      address={addressToFormAddress(address)}
                      title={`Edit ${address.first_name} ${address.last_name}`}
                    />
                  </CardContent>
                ) : (
                  <>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
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
                        {address.city}
                        {address.province ? `, ${address.province}` : ""}{" "}
                        {address.postal_code}
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

                      <div className="flex flex-wrap gap-2">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="font-mono text-xs uppercase tracking-wider"
                        >
                          <Link
                            href={`/account/addresses?edit=${address.id}#address-form`}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Edit
                          </Link>
                        </Button>
                        {!address.is_default && (
                          <form
                            action={async () => {
                              "use server"
                              await setDefaultAddressAction(address.id)
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
                            "use server"
                            await deleteAddressAction(address.id)
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
                  </>
                )}
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground font-mono uppercase tracking-wider text-sm">
              No saved addresses yet
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Add your first address to get started
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
