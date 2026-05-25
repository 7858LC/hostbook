"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";

interface Plan {
  id: "monthly" | "annual";
  name: string;
  price: string;
  period: string;
  perMonth: string;
  priceId: string;
  badge?: string;
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: "monthly",
    name: "Monthly",
    price: "$19",
    period: "/month",
    perMonth: "$19/mo",
    priceId: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID ?? "",
    features: [
      "Unlimited properties",
      "Unlimited bookings & expenses",
      "Schedule E reports",
      "Tax center",
      "CSV export",
      "Google Sheets sync",
    ],
  },
  {
    id: "annual",
    name: "Annual",
    price: "$149",
    period: "/year",
    perMonth: "$12.42/mo",
    priceId: process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID ?? "",
    badge: "BEST VALUE",
    features: [
      "Everything in Monthly",
      "Save 35% vs monthly",
      "Priority support",
      "Early access to new features",
    ],
  },
];

export default function SubscribePage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleCheckout(priceId: string, planId: string) {
    if (!session) { window.location.href = "/api/auth/signin"; return; }
    if (!priceId) { setError("Plan not configured yet — check back soon."); return; }
    setLoading(planId);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const json = await res.json() as { data?: { url: string }; error?: string };
      if (json.data?.url) { window.location.href = json.data.url; return; }
      setError(json.error ?? "Failed to start checkout");
    } catch {
      setError("Network error — please try again");
    } finally { setLoading(null); }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-12">
      <div className="max-w-2xl mx-auto text-center mb-10">
        <p className="text-ocean font-semibold text-sm mb-2 tracking-wide uppercase">Pricing</p>
        <h1 className="text-3xl font-bold text-[#f5f5f5] mb-3">Simple, honest pricing</h1>
        <p className="text-[#525252]">30-day free trial. No credit card required to start.</p>
      </div>

      <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {PLANS.map(plan => (
          <div
            key={plan.id}
            className={`relative bg-[#1a1a1a] border rounded-2xl p-6 ${plan.badge ? "border-ocean" : "border-[#2a2a2a]"}`}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-ocean text-white text-xs font-bold px-3 py-1 rounded-full">{plan.badge}</span>
              </div>
            )}
            <p className="font-semibold text-[#f5f5f5] mb-1">{plan.name}</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-bold text-[#f5f5f5]">{plan.price}</span>
              <span className="text-[#525252] text-sm">{plan.period}</span>
            </div>
            <p className="text-xs text-[#525252] mb-5">{plan.perMonth} billed {plan.id === "annual" ? "annually" : "monthly"}</p>
            <ul className="space-y-2 mb-6">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-[#a3a3a3]">
                  <span className="text-ocean">✓</span> {f}
                </li>
              ))}
            </ul>
            <Button
              fullWidth
              onClick={() => handleCheckout(plan.priceId, plan.id)}
              loading={loading === plan.id}
            >
              Start 30-Day Free Trial
            </Button>
          </div>
        ))}
      </div>

      {error && <p className="text-loss text-sm text-center mb-4">{error}</p>}

      <p className="text-xs text-[#525252] text-center max-w-md mx-auto">
        Your data lives in your Google Drive. Cancel anytime from Settings — no questions asked.
        By subscribing you agree to our{" "}
        <a href="/legal/terms" className="text-ocean hover:underline">Terms</a> and{" "}
        <a href="/legal/privacy" className="text-ocean hover:underline">Privacy Policy</a>.
      </p>
    </div>
  );
}
