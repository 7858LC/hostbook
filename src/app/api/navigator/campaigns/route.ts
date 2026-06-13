import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getOrCreateSpreadsheet } from "@/lib/sheets"
import { getCampaigns, saveCampaign, deleteCampaign } from "@/lib/navigator/storage"
import type { Campaign } from "@/types/navigator"

async function getSpreadsheetId(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null
  return getOrCreateSpreadsheet(session.user.email, (session as { accessToken?: string }).accessToken)
}

export async function GET(req: NextRequest) {
  const spreadsheetId = await getSpreadsheetId(req)
  if (!spreadsheetId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const campaigns = await getCampaigns(spreadsheetId)
    return NextResponse.json({ campaigns })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const spreadsheetId = await getSpreadsheetId(req)
  if (!spreadsheetId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const body = await req.json() as Partial<Campaign>
    const campaign = await saveCampaign(spreadsheetId, body as Campaign)
    return NextResponse.json({ campaign }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const spreadsheetId = await getSpreadsheetId(req)
  if (!spreadsheetId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const body = await req.json() as Campaign
    if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const campaign = await saveCampaign(spreadsheetId, body)
    return NextResponse.json({ campaign })
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
    await deleteCampaign(spreadsheetId, id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
