import { NextResponse } from "next/server"
import { runTradeScan } from "@/lib/scanner"
import { qualifyBatch } from "@/lib/qualify"
import { saveLeads, getLeads } from "@/lib/storage"

export async function POST() {
  const raw = await runTradeScan(30)
  const existing = await getLeads()
  const existingIds = new Set(existing.map(l => l.id))
  const newLeads = raw.filter(l => !existingIds.has(l.id))
  const qualified = await qualifyBatch(newLeads)
  await saveLeads(qualified)
  return NextResponse.json({ scanned: raw.length, new: newLeads.length, qualified: qualified.filter(l => l.status === "qualified").length })
}
