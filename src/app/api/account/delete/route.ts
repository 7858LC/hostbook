import { NextResponse } from "next/server";
import { getSessionData } from "@/lib/session";
import { logger } from "@/lib/logger";
import { rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import type { ApiError } from "@/types";

export async function DELETE(): Promise<NextResponse> {
  try {
    const s = await getSessionData();
    if (!s?.email || !s?.spreadsheetId)
      return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });

    const rl = rateLimit(`delete-account:${s.email}`, 2, 10 * 60_000);
    if (!rl.success)
      return NextResponse.json<ApiError>({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl, 2) });

    // Clear all user data sheets (keep headers)
    const { google } = await import("googleapis");
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? "{}"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });

    // Clear data rows from Properties, Bookings, Expenses (leave row 1 header)
    for (const range of ["Properties!A2:Z", "Bookings!A2:Z", "Expenses!A2:Z", "Settings!A2:Z"]) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: s.spreadsheetId,
        range,
      });
    }

    // Remove from master registry
    const masterSheetId = process.env.MASTER_SPREADSHEET_ID ?? "";
    if (masterSheetId) {
      const masterRes = await sheets.spreadsheets.values.get({
        spreadsheetId: masterSheetId,
        range: "Registry!A:B",
      });
      const rows = masterRes.data.values ?? [];
      const rowIndex = rows.findIndex(r => r[0] === s.email);
      if (rowIndex > 0) {
        await sheets.spreadsheets.values.clear({
          spreadsheetId: masterSheetId,
          range: `Registry!A${rowIndex + 1}:B${rowIndex + 1}`,
        });
      }
    }

    logger.info("Account deleted", { email: s.email });
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    logger.error("DELETE /api/account/delete", err);
    return NextResponse.json<ApiError>({ error: "Failed to delete account" }, { status: 500 });
  }
}
