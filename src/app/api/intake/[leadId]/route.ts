import { NextRequest, NextResponse } from "next/server"
import { getLead, updateLeadStatus } from "@/lib/storage"
import { startCascade } from "@/lib/cascade"

export async function POST(req: NextRequest, { params }: { params: { leadId: string } }) {
  const lead = await getLead(params.leadId)
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (lead.status === "claimed" || lead.status === "expired") {
    return NextResponse.json({ error: "This lead is no longer available." }, { status: 410 })
  }

  const { name, phone } = await req.json() as { name: string; phone: string }
  if (!name?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: "Name and phone are required." }, { status: 400 })
  }

  // Save homeowner contact info and mark intake received
  await updateLeadStatus(params.leadId, "intake_received", {
    homeownerName: name.trim(),
    homeownerPhone: phone.trim(),
  })

  // Start the buyer cascade
  await startCascade(params.leadId)

  return NextResponse.json({ ok: true })
}
