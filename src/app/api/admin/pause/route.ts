import { NextRequest, NextResponse } from "next/server"
import { isAdminRequest } from "@/lib/auth-server"
import { getBuyers, saveBuyer } from "@/lib/storage"

export async function POST(req: NextRequest) {
  if (!await isAdminRequest()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { buyerId, active } = await req.json() as { buyerId: string; active: boolean }
  const buyers = await getBuyers(false)
  const buyer = buyers.find(b => b.id === buyerId)
  if (!buyer) return NextResponse.json({ error: "Buyer not found" }, { status: 404 })

  await saveBuyer({ ...buyer, active })
  return NextResponse.json({ ok: true })
}
