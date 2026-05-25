import { NextRequest, NextResponse } from "next/server";
import { getSessionData } from "@/lib/session";
import { getBookings, getExpenses, getProperties } from "@/lib/sheets";
import { centsToDollars } from "@/lib/money";
import { logger } from "@/lib/logger";
import { rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import type { ApiError } from "@/types";

function escapeCsv(val: string | number): string {
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n"))
    return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsvRow(cells: (string | number)[]): string {
  return cells.map(escapeCsv).join(",");
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const s = await getSessionData();
    if (!s?.email || !s?.spreadsheetId)
      return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });

    const rl = rateLimit(`export:${s.email}`, 10);
    if (!rl.success)
      return NextResponse.json<ApiError>({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl, 10) });

    const type = new URL(req.url).searchParams.get("type") ?? "bookings";

    let csv = "";

    if (type === "bookings") {
      const bookings = await getBookings(s.spreadsheetId);
      csv = [
        toCsvRow(["ID", "Property", "Check-in", "Check-out", "Nights", "Guests", "Platform", "Gross Revenue", "Cleaning Fee", "Platform Fee", "Net Revenue", "Status", "Notes"]),
        ...bookings.map(b => toCsvRow([
          b.id, b.property_name, b.check_in, b.check_out, b.nights, b.guests,
          b.platform,
          centsToDollars(b.gross_revenue),
          centsToDollars(b.cleaning_fee),
          centsToDollars(b.platform_fee),
          centsToDollars(b.net_revenue),
          b.status, b.notes,
        ])),
      ].join("\n");
    } else if (type === "expenses") {
      const expenses = await getExpenses(s.spreadsheetId);
      csv = [
        toCsvRow(["ID", "Property", "Date", "Category", "Schedule E Line", "Description", "Amount", "Tax Deductible", "Receipt URL", "Notes"]),
        ...expenses.map(e => toCsvRow([
          e.id, e.property_name, e.date, e.category, e.schedule_e_line,
          e.description, centsToDollars(e.amount), e.tax_deductible, e.receipt_url, e.notes,
        ])),
      ].join("\n");
    } else if (type === "properties") {
      const properties = await getProperties(s.spreadsheetId);
      csv = [
        toCsvRow(["ID", "Name", "Address", "Bedrooms", "Bathrooms", "Max Guests", "Nightly Rate", "Active", "Notes"]),
        ...properties.map(p => toCsvRow([
          p.id, p.name, p.address, p.bedrooms, p.bathrooms, p.max_guests,
          centsToDollars(p.nightly_rate), p.active, p.notes,
        ])),
      ].join("\n");
    } else {
      return NextResponse.json<ApiError>({ error: "Invalid type" }, { status: 400 });
    }

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="hostbook-${type}-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (err) {
    logger.error("GET /api/sheets/export", err);
    return NextResponse.json<ApiError>({ error: "Export failed" }, { status: 500 });
  }
}
