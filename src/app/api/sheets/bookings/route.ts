import { NextRequest, NextResponse } from "next/server";
import { getSessionData } from "@/lib/session";
import { getBookings, addBooking, updateBooking, deleteBooking } from "@/lib/sheets";
import { rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { dollarsToCents } from "@/lib/money";
import { logger } from "@/lib/logger";
import type { ApiError } from "@/types";
import { differenceInDays, parseISO } from "date-fns";

export async function GET(): Promise<NextResponse> {
  try {
    const s = await getSessionData();
    if (!s) return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    const rl = rateLimit(`bookings:read:${s.email}`, 60);
    if (!rl.success) return NextResponse.json<ApiError>({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl, 60) });
    return NextResponse.json({ data: await getBookings(s.spreadsheetId) });
  } catch (err) {
    logger.error("GET /api/sheets/bookings", err);
    return NextResponse.json<ApiError>({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const s = await getSessionData();
    if (!s) return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    const rl = rateLimit(`bookings:write:${s.email}`, 30);
    if (!rl.success) return NextResponse.json<ApiError>({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl, 30) });

    const body = await req.json() as {
      property_id: string; property_name: string;
      check_in: string; check_out: string; guests?: number; platform: string;
      gross_revenue: number; cleaning_fee?: number; platform_fee: number; notes?: string;
    };

    const nights = differenceInDays(parseISO(body.check_out), parseISO(body.check_in));
    const grossCents  = dollarsToCents(body.gross_revenue);
    const cleanCents  = dollarsToCents(body.cleaning_fee ?? 0);
    const feeCents    = dollarsToCents(body.platform_fee);
    const netCents    = grossCents - feeCents;

    const booking = await addBooking(s.spreadsheetId, {
      property_id: body.property_id,
      property_name: body.property_name,
      check_in: body.check_in,
      check_out: body.check_out,
      nights: Math.max(1, nights),
      guests: body.guests ?? 1,
      platform: body.platform,
      gross_revenue: grossCents,
      cleaning_fee: cleanCents,
      platform_fee: feeCents,
      net_revenue: netCents,
      status: "confirmed",
      notes: body.notes ?? "",
    });

    return NextResponse.json({ data: booking }, { status: 201 });
  } catch (err) {
    logger.error("POST /api/sheets/bookings", err);
    return NextResponse.json<ApiError>({ error: "Failed to add booking" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const s = await getSessionData();
    if (!s) return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json() as { id: string; [key: string]: unknown };
    if (!body.id) return NextResponse.json<ApiError>({ error: "Missing id" }, { status: 400 });
    const { id, ...updates } = body;
    if (updates.gross_revenue !== undefined) updates.gross_revenue = dollarsToCents(updates.gross_revenue as number);
    if (updates.cleaning_fee !== undefined)  updates.cleaning_fee  = dollarsToCents(updates.cleaning_fee as number);
    if (updates.platform_fee !== undefined)  updates.platform_fee  = dollarsToCents(updates.platform_fee as number);
    if (updates.gross_revenue !== undefined && updates.platform_fee !== undefined)
      updates.net_revenue = (updates.gross_revenue as number) - (updates.platform_fee as number);
    const updated = await updateBooking(s.spreadsheetId, id, updates as Parameters<typeof updateBooking>[2]);
    return NextResponse.json({ data: updated });
  } catch (err) {
    logger.error("PUT /api/sheets/bookings", err);
    return NextResponse.json<ApiError>({ error: "Failed to update booking" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const s = await getSessionData();
    if (!s) return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json<ApiError>({ error: "Missing id" }, { status: 400 });
    await deleteBooking(s.spreadsheetId, id);
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    logger.error("DELETE /api/sheets/bookings", err);
    return NextResponse.json<ApiError>({ error: "Failed to delete booking" }, { status: 500 });
  }
}
