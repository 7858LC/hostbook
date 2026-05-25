import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSettings } from "@/lib/sheets";
import { getSessionData } from "@/lib/session";
import { logger } from "@/lib/logger";
import type { ApiError } from "@/types";

export async function POST(): Promise<NextResponse> {
  try {
    const s = await getSessionData();
    if (!s) return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    const settings = await getSettings(s.spreadsheetId);
    if (!settings.stripe_customer_id)
      return NextResponse.json<ApiError>({ error: "No Stripe customer found" }, { status: 400 });
    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: settings.stripe_customer_id,
      return_url: `${appUrl}/settings`,
    });
    return NextResponse.json({ data: { url: portalSession.url } });
  } catch (err) {
    logger.error("POST /api/stripe/portal", err);
    return NextResponse.json<ApiError>({ error: "Failed to create portal session" }, { status: 500 });
  }
}
