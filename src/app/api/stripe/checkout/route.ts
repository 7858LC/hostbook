import { NextRequest, NextResponse } from "next/server";
import { getSessionData } from "@/lib/session";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { getSettings, updateSettings } from "@/lib/sheets";
import { logger } from "@/lib/logger";
import { rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import type { ApiError } from "@/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const sessionData = await getSessionData();
    if (!sessionData?.email || !sessionData?.spreadsheetId)
      return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });

    const rl = rateLimit(`checkout:${sessionData.email}`, 5);
    if (!rl.success) return NextResponse.json<ApiError>({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl, 5) });

    const body = await req.json() as { priceId: string };
    const allowed = [process.env.STRIPE_MONTHLY_PRICE_ID, process.env.STRIPE_ANNUAL_PRICE_ID].filter(Boolean);
    if (allowed.length > 0 && !allowed.includes(body.priceId))
      return NextResponse.json<ApiError>({ error: "Invalid price ID" }, { status: 400 });

    const session = await getServerSession(authOptions);
    const stripe = getStripe();
    const settings = await getSettings(sessionData.spreadsheetId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "";

    let customerId = settings.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: sessionData.email,
        name: session?.user?.name ?? undefined,
        metadata: { spreadsheetId: sessionData.spreadsheetId, email: sessionData.email },
      });
      customerId = customer.id;
      await updateSettings(sessionData.spreadsheetId, { stripe_customer_id: customerId });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: body.priceId, quantity: 1 }],
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 30,
        metadata: { spreadsheetId: sessionData.spreadsheetId, email: sessionData.email },
      },
      success_url: `${appUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/subscribe`,
    });

    logger.info("Checkout session created", { email: sessionData.email });
    return NextResponse.json({ data: { url: checkoutSession.url } });
  } catch (err) {
    logger.error("POST /api/stripe/checkout", err);
    return NextResponse.json<ApiError>({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
