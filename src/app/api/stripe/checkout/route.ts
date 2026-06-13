import { NextRequest, NextResponse } from "next/server"
import { createLeadCheckout } from "@/lib/stripe"
import { getLeads } from "@/lib/storage"

export async function POST(req: NextRequest) {
  const { leadId, buyerEmail, buyerName } = await req.json() as { leadId: string; buyerEmail: string; buyerName?: string }
  const leads = await getLeads()
  const lead = leads.find(l => l.id === leadId)
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  if (lead.status === "claimed") return NextResponse.json({ error: "Lead already claimed" }, { status: 409 })
  const url = await createLeadCheckout(leadId, buyerEmail, lead.estimatedValue, lead.problemSummary)
  if (!url) return NextResponse.json({ error: "Stripe not configured — contact support" }, { status: 503 })
  return NextResponse.json({ url })
}
