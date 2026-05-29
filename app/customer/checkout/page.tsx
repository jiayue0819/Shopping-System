import { CheckoutForm } from "@/components/customer/checkout-form";
import { requireCustomer } from "@/lib/auth/session";

export default async function CustomerCheckoutPage() {
  await requireCustomer();
  return <CheckoutForm />;
}
