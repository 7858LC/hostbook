import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getOrCreateSpreadsheet } from "@/lib/sheets"
import { getProducts, saveProduct, deleteProduct } from "@/lib/navigator/storage"
import type { Product } from "@/types/navigator"

async function getSpreadsheetId(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null
  return getOrCreateSpreadsheet(session.user.email, (session as { accessToken?: string }).accessToken)
}

export async function GET(req: NextRequest) {
  const spreadsheetId = await getSpreadsheetId(req)
  if (!spreadsheetId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const products = await getProducts(spreadsheetId)
    return NextResponse.json({ products })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const spreadsheetId = await getSpreadsheetId(req)
  if (!spreadsheetId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const body = await req.json() as Partial<Product>
    const product = await saveProduct(spreadsheetId, body as Product)
    return NextResponse.json({ product }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const spreadsheetId = await getSpreadsheetId(req)
  if (!spreadsheetId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const body = await req.json() as Product
    if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const product = await saveProduct(spreadsheetId, body)
    return NextResponse.json({ product })
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
    await deleteProduct(spreadsheetId, id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
