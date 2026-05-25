import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY not configured");
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20", typescript: true });
  }
  return _stripe;
}

export function isSubscriptionActive(status: string, trialEndDate: string): boolean {
  if (status === "active") return true;
  if (status === "trialing" && trialEndDate) return new Date(trialEndDate) > new Date();
  return false;
}
