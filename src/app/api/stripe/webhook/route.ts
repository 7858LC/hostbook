import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { updateSettings } from "@/lib/sheets";
import { logger } from "@/lib/logger";
import type Stripe from "stripe";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    logger.warn("Webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const spreadsheetId = session.metadata?.spreadsheetId;
      const subscriptionId = session.subscription as string;
      if (spreadsheetId && subscriptionId) {
        const stripe = getStripe();
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const trialEnd = subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        await updateSettings(spreadsheetId, {
          stripe_subscription_id: subscriptionId,
          subscription_status: subscription.status,
          trial_end_date: trialEnd,
        });
        logger.info("Subscription activated", { spreadsheetId, status: subscription.status });
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const spreadsheetId = sub.metadata?.spreadsheetId;
      if (spreadsheetId) {
        await updateSettings(spreadsheetId, { subscription_status: sub.status });
        logger.info("Subscription updated", { spreadsheetId, status: sub.status });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error("Webhook handler error", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}
