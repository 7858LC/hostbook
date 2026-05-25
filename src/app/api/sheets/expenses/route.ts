import { NextRequest, NextResponse } from "next/server";
import { getSessionData } from "@/lib/session";
import { getExpenses, addExpense, updateExpense, deleteExpense } from "@/lib/sheets";
import { rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { dollarsToCents } from "@/lib/money";
import { logger } from "@/lib/logger";
import type { ApiError, ScheduleELine } from "@/types";

export async function GET(): Promise<NextResponse> {
  try {
    const s = await getSessionData();
    if (!s) return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    const rl = rateLimit(`exp:read:${s.email}`, 60);
    if (!rl.success) return NextResponse.json<ApiError>({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl, 60) });
    return NextResponse.json({ data: await getExpenses(s.spreadsheetId) });
  } catch (err) {
    logger.error("GET /api/sheets/expenses", err);
    return NextResponse.json<ApiError>({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const s = await getSessionData();
    if (!s) return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    const rl = rateLimit(`exp:write:${s.email}`, 30);
    if (!rl.success) return NextResponse.json<ApiError>({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl, 30) });
    const body = await req.json() as { property_id: string; property_name: string; date: string; category: string; schedule_e_line: ScheduleELine; description: string; amount: number; tax_deductible?: "yes" | "no"; receipt_url?: string; notes?: string };
    const expense = await addExpense(s.spreadsheetId, {
      ...body,
      amount: dollarsToCents(body.amount),
      tax_deductible: body.tax_deductible ?? "yes",
      receipt_url: body.receipt_url ?? "",
      notes: body.notes ?? "",
    });
    return NextResponse.json({ data: expense }, { status: 201 });
  } catch (err) {
    logger.error("POST /api/sheets/expenses", err);
    return NextResponse.json<ApiError>({ error: "Failed to add expense" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const s = await getSessionData();
    if (!s) return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json() as { id: string; [key: string]: unknown };
    if (!body.id) return NextResponse.json<ApiError>({ error: "Missing id" }, { status: 400 });
    const { id, ...updates } = body;
    if (updates.amount !== undefined) updates.amount = dollarsToCents(updates.amount as number);
    const updated = await updateExpense(s.spreadsheetId, id, updates as Parameters<typeof updateExpense>[2]);
    return NextResponse.json({ data: updated });
  } catch (err) {
    logger.error("PUT /api/sheets/expenses", err);
    return NextResponse.json<ApiError>({ error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const s = await getSessionData();
    if (!s) return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json<ApiError>({ error: "Missing id" }, { status: 400 });
    await deleteExpense(s.spreadsheetId, id);
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    logger.error("DELETE /api/sheets/expenses", err);
    return NextResponse.json<ApiError>({ error: "Failed to delete expense" }, { status: 500 });
  }
}
