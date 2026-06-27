import { NextResponse } from "next/server"
import { isAdminRequest } from "@/lib/auth-server"
import { getBuyers, getLeads } from "@/lib/storage"

export async function GET() {
  if (!await isAdminRequest()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [buyers, claimedLeads] = await Promise.all([
    getBuyers(false),
    getLeads("claimed"),
  ])

  const revenue = claimedLeads.reduce((sum, l) => sum + l.estimatedValue, 0)
  const activeCount = buyers.filter(b => b.active).length

  const usageByBuyer: Record<string, { count: number; tradeTypes: Record<string, number> }> = {}
  for (const lead of claimedLeads) {
    if (!lead.claimedBy) continue
    const key = lead.claimedBy
    if (!usageByBuyer[key]) usageByBuyer[key] = { count: 0, tradeTypes: {} }
    usageByBuyer[key].count++
    const t = lead.tradeType
    usageByBuyer[key].tradeTypes[t] = (usageByBuyer[key].tradeTypes[t] ?? 0) + 1
  }

  return NextResponse.json({ buyers, revenue, activeCount, usageByBuyer, claimedCount: claimedLeads.length })
}
