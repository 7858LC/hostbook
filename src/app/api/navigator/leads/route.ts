import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getOrCreateSpreadsheet } from "@/lib/sheets"
import { getLeads, saveLead, updateLeadStatus, deleteLead } from "@/lib/navigator/storage"
import type { Lead, LeadStatus } from "@/types/navigator"

async function getSpreadsheetId(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null
  return getOrCreateSpreadsheet(session.user.email, (session as { accessToken?: string }).accessToken)
}

export async function GET(req: NextRequest) {
  const spreadsheetId = await getSpreadsheetId(req)
  if (!spreadsheetId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get("campaignId") ?? undefined
    const leads = await getLeads(spreadsheetId, campaignId)
    return NextResponse.json({ leads })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const spreadsheetId = await getSpreadsheetId(req)
  if (!spreadsheetId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const body = await req.json() as Partial<Lead>
    const lead = await saveLead(spreadsheetId, body as Lead)
    return NextResponse.json({ lead }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const spreadsheetId = await getSpreadsheetId(req)
  if (!spreadsheetId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const body = await req.json() as { id: string; status?: LeadStatus; updates?: Partial<Lead> }
    if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const lead = await updateLeadStatus(spreadsheetId, body.id, body.status ?? "new", body.updates)
    return NextResponse.json({ lead })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const spreadsheetId = await getSpreadsheetId(req)
  if (!spreadsheetId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const { id } = await req.json() as { id: string }
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    await deleteLead(spreadsheetId, id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
