import { NextRequest, NextResponse } from "next/server";
import { getSessionData } from "@/lib/session";
import { getProperties, addProperty, updateProperty } from "@/lib/sheets";
import { rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { dollarsToCents } from "@/lib/money";
import type { ApiError } from "@/types";

export async function GET(): Promise<NextResponse> {
  try {
    const s = await getSessionData();
    if (!s) return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    const rl = rateLimit(`props:read:${s.email}`, 60);
    if (!rl.success) return NextResponse.json<ApiError>({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl, 60) });
    const properties = await getProperties(s.spreadsheetId);
    return NextResponse.json({ data: properties });
  } catch (err) {
    logger.error("GET /api/sheets/properties", err);
    return NextResponse.json<ApiError>({ error: "Failed to fetch properties" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const s = await getSessionData();
    if (!s) return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    const rl = rateLimit(`props:write:${s.email}`, 20);
    if (!rl.success) return NextResponse.json<ApiError>({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl, 20) });
    const body = await req.json() as { name: string; address?: string; bedrooms?: number; bathrooms?: number; max_guests?: number; nightly_rate?: number; notes?: string };
    if (!body.name?.trim()) return NextResponse.json<ApiError>({ error: "Property name is required" }, { status: 400 });
    const property = await addProperty(s.spreadsheetId, {
      name: body.name.trim(),
      address: body.address ?? "",
      bedrooms: body.bedrooms ?? 0,
      bathrooms: body.bathrooms ?? 0,
      max_guests: body.max_guests ?? 0,
      nightly_rate: dollarsToCents(body.nightly_rate ?? 0),
      active: "yes",
      notes: body.notes ?? "",
    });
    return NextResponse.json({ data: property }, { status: 201 });
  } catch (err) {
    logger.error("POST /api/sheets/properties", err);
    return NextResponse.json<ApiError>({ error: "Failed to add property" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const s = await getSessionData();
    if (!s) return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json() as { id: string; [key: string]: unknown };
    if (!body.id) return NextResponse.json<ApiError>({ error: "Missing id" }, { status: 400 });
    const { id, ...updates } = body;
    if (updates.nightly_rate !== undefined) updates.nightly_rate = dollarsToCents(updates.nightly_rate as number);
    const updated = await updateProperty(s.spreadsheetId, id, updates as Parameters<typeof updateProperty>[2]);
    return NextResponse.json({ data: updated });
  } catch (err) {
    logger.error("PUT /api/sheets/properties", err);
    return NextResponse.json<ApiError>({ error: "Failed to update property" }, { status: 500 });
  }
}
