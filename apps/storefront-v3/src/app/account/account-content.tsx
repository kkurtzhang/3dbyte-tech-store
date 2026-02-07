"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { updateProfileAction, deleteAccountAction } from "@/app/actions/auth";
import { updateAccount } from "@/app/actions/account";
import { AccountRecentlyViewed } from "@/components/account/account-recently-viewed";

interface CustomerData {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
}

export function AccountContent({ customer }: { customer: CustomerData }) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async (formData) => {
              "use server";
              const data = {
                first_name: formData.get("first_name") as string,
                last_name: formData.get("last_name") as string,
                phone: formData.get("phone") as string,
              };
              await updateProfileAction(data);
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  defaultValue={customer.first_name || ""}
                  placeholder="Enter first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  defaultValue={customer.last_name || ""}
                  placeholder="Enter last name"
                />
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                defaultValue={customer.email || ""}
                placeholder="your@email.com"
                disabled
                className="bg-muted/50"
              />
            </div>

            <div className="space-y-2 mt-4">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={customer.phone || ""}
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div className="flex justify-end mt-6">
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            Privacy & Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete your account and all associated data. This action
            cannot be undone.
          </p>
          <DeleteAccountButton />
        </CardContent>
      </Card>
    </>
  );
}

function DeleteAccountButton() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAccountAction();
    } catch (error) {
      console.error("Failed to delete account:", error);
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="flex gap-3">
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? "Deleting..." : "Confirm Delete"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowConfirm(false)}
          disabled={isDeleting}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button variant="destructive" onClick={() => setShowConfirm(true)}>
      Delete Account
    </Button>
  );
}
