import { NextRequest, NextResponse } from "next/server";
import { getSessionData } from "@/lib/session";
import { getSettings, updateSettings } from "@/lib/sheets";
import { logger } from "@/lib/logger";
import type { ApiError } from "@/types";

export async function GET(): Promise<NextResponse> {
  try {
    const s = await getSessionData();
    if (!s) return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ data: await getSettings(s.spreadsheetId) });
  } catch (err) {
    logger.error("GET /api/sheets/settings", err);
    return NextResponse.json<ApiError>({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const s = await getSessionData();
    if (!s) return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json() as { business_name?: string; state?: string; tax_rate?: number };
    await updateSettings(s.spreadsheetId, body);
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    logger.error("PUT /api/sheets/settings", err);
    return NextResponse.json<ApiError>({ error: "Failed to save settings" }, { status: 500 });
  }
}
