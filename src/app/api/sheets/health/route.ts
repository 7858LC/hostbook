import { NextResponse } from "next/server";
import { getSessionData } from "@/lib/session";
import { logger } from "@/lib/logger";
import { rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import type { ApiError } from "@/types";

const EXPECTED_HEADERS = {
  Properties: ["id", "name", "address", "bedrooms", "bathrooms", "max_guests", "nightly_rate", "active", "notes"],
  Bookings: ["id", "property_id", "property_name", "check_in", "check_out", "nights", "guests", "platform", "gross_revenue", "cleaning_fee", "platform_fee", "net_revenue", "status", "notes"],
  Expenses: ["id", "property_id", "property_name", "date", "category", "schedule_e_line", "description", "amount", "tax_deductible", "receipt_url", "notes"],
  Settings: ["key", "value"],
};

export async function GET(): Promise<NextResponse> {
  try {
    const s = await getSessionData();
    if (!s?.spreadsheetId)
      return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });

    const rl = rateLimit(`health:${s.email}`, 10);
    if (!rl.success)
      return NextResponse.json<ApiError>({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl, 10) });

    const { google } = await import("googleapis");
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? "{}"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    const sheets = google.sheets({ version: "v4", auth });

    const issues: string[] = [];
    for (const [sheet, expected] of Object.entries(EXPECTED_HEADERS)) {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: s.spreadsheetId,
        range: `${sheet}!1:1`,
      });
      const actual = (res.data.values?.[0] ?? []) as string[];
      const missing = expected.filter(h => !actual.includes(h));
      if (missing.length > 0) {
        issues.push(`${sheet}: missing columns ${missing.join(", ")}`);
      }
    }

    return NextResponse.json({ data: { ok: issues.length === 0, issues } });
  } catch (err) {
    logger.error("GET /api/sheets/health", err);
    return NextResponse.json<ApiError>({ error: "Health check failed" }, { status: 500 });
  }
}
