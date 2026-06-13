import Stripe from "stripe"

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

export async function createLeadCheckout(leadId: string, buyerEmail: string, amount: number, leadSummary: string): Promise<string | null> {
  if (!stripe) return null
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: buyerEmail,
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: {
          name: `Trades Lead — ${leadSummary.slice(0, 60)}`,
          description: "Exclusive warm lead from an active homeowner seeking trades service",
        },
        unit_amount: amount * 100,
      },
      quantity: 1,
    }],
    metadata: { leadId, buyerEmail },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3003"}/claim/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3003"}/claim/cancelled`,
  })
  return session.url
}
