import { redirect } from "next/navigation";
import { getSessionAction } from "@/app/actions/auth";
import { ProductRegistrationForm } from "./product-registration-form";

export const metadata = {
  title: "Product Registrations | Account",
  description: "Register product serial numbers to unlock account files.",
};

export default async function ProductRegistrationsPage() {
  const session = await getSessionAction();

  if (!session.success) {
    redirect("/sign-in?redirect=/account/product-registrations");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Product registrations</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Register a product serial number to unlock files in your account.
      </p>
      <div className="mt-6">
        <ProductRegistrationForm />
      </div>
    </div>
  );
}
