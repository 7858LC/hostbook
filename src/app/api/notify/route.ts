import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { getBuyers, updateLeadStatus, getLeads } from "@/lib/storage"
import { createLeadCheckout } from "@/lib/stripe"

export async function POST(req: NextRequest) {
  const { leadId } = await req.json() as { leadId: string }
  const leads = await getLeads()
  const lead = leads.find(l => l.id === leadId)
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 })

  const buyers = await getBuyers(true)
  const matching = buyers.filter(b =>
    b.serviceTypes.includes(lead.tradeType as "hvac" | "plumbing" | "electrical" | "general") ||
    b.serviceTypes.includes("general") ||
    lead.tradeType === "unknown"
  )

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: "RESEND_API_KEY not set", notified: 0 })

  const resend = new Resend(apiKey)
  const from = process.env.RESEND_FROM_EMAIL ?? "LeadFlow <onboarding@resend.dev>"

  let notified = 0
  for (const buyer of matching) {
    const checkoutUrl = await createLeadCheckout(leadId, buyer.email, lead.estimatedValue, lead.problemSummary)
    const claimUrl = checkoutUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/claim/${leadId}?buyer=${buyer.id}`

    await resend.emails.send({
      from,
      to: buyer.email,
      subject: `New ${lead.tradeType.toUpperCase()} Lead — ${lead.urgency === "emergency" ? "Emergency" : lead.urgency === "urgent" ? "Urgent" : "Planned"}${lead.location ? ` in ${lead.location}` : ""}`,
      text: `Hi ${buyer.contactName},

A new lead matching your service area just came in.

Problem: ${lead.problemSummary}
Type: ${lead.tradeType.toUpperCase()}
Urgency: ${lead.urgency}${lead.location ? `\nLocation: ${lead.location}${lead.locationState ? `, ${lead.locationState}` : ""}` : ""}
Quality Score: ${lead.qualityScore}/10

Claim this lead for $${lead.estimatedValue} (exclusive — not sold to other buyers):
${claimUrl}

First to pay gets it.

— LeadFlow Team`,
    })
    notified++
  }

  await updateLeadStatus(leadId, "notified", { notifiedAt: new Date().toISOString() })
  return NextResponse.json({ notified, matching: matching.length })
}
