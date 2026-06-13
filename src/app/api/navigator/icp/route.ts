import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getOrCreateSpreadsheet } from "@/lib/sheets"
import { getICPs, saveICP, deleteICP } from "@/lib/navigator/storage"
import type { ICP } from "@/types/navigator"

async function getSpreadsheetId(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null
  return getOrCreateSpreadsheet(session.user.email, (session as { accessToken?: string }).accessToken)
}

export async function GET(req: NextRequest) {
  const spreadsheetId = await getSpreadsheetId(req)
  if (!spreadsheetId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const icps = await getICPs(spreadsheetId)
    return NextResponse.json({ icps })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const spreadsheetId = await getSpreadsheetId(req)
  if (!spreadsheetId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const body = await req.json() as Partial<ICP>
    const icp = await saveICP(spreadsheetId, body as ICP)
    return NextResponse.json({ icp }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const spreadsheetId = await getSpreadsheetId(req)
  if (!spreadsheetId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const body = await req.json() as ICP
    if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const icp = await saveICP(spreadsheetId, body)
    return NextResponse.json({ icp })
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
    await deleteICP(spreadsheetId, id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
