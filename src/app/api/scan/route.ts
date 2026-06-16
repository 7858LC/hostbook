import { NextResponse } from "next/server"
import { runTradeScan } from "@/lib/scanner"
import { qualifyBatch } from "@/lib/qualify"
import { saveLeads, getLeads } from "@/lib/storage"
import { isAdminRequest } from "@/lib/auth-server"
import { checkDailyCap } from "@/lib/rateLimit"

export async function POST() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!checkDailyCap("scan", 20)) return NextResponse.json({ error: "Daily limit reached" }, { status: 429 })

  const raw = await runTradeScan(30)
  const existing = await getLeads()
  const existingIds = new Set(existing.map(l => l.id))
  const newLeads = raw.filter(l => !existingIds.has(l.id))
  const qualified = await qualifyBatch(newLeads)
  await saveLeads(qualified)
  return NextResponse.json({ scanned: raw.length, new: newLeads.length, qualified: qualified.filter(l => l.status === "qualified").length })
}
