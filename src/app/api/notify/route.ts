import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { getBuyers, updateLeadStatus, getLeads } from "@/lib/storage"

export async function POST(req: NextRequest) {
  const { leadId } = await req.json() as { leadId: string }
  const leads = await getLeads()
  const lead = leads.find(l => l.id === leadId)
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 })

  const buyers = await getBuyers(true)
  const matching = buyers.filter(b =>
    b.serviceTypes.includes(lead.tradeType as "hvac" | "plumbing" | "electrical" | "roofing" | "general") ||
    b.serviceTypes.includes("general") ||
    lead.tradeType === "unknown"
  )

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: "RESEND_API_KEY not set", notified: 0 })

  const resend = new Resend(apiKey)
  const from = process.env.RESEND_FROM_EMAIL ?? "LeadFlow <onboarding@resend.dev>"
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3003"

  let notified = 0
  for (const buyer of matching) {
    // Always route through claim page so buyer sees ToS before paying
    const claimUrl = `${appUrl}/claim/${leadId}?email=${encodeURIComponent(buyer.email)}`

    await resend.emails.send({
      from,
      to: buyer.email,
      subject: `New ${lead.tradeType.toUpperCase()} Lead — ${lead.urgency === "emergency" ? "🚨 Emergency" : lead.urgency === "urgent" ? "⚡ Urgent" : "Planned"}${lead.location ? ` in ${lead.location}` : ""}`,
      text: `Hi ${buyer.contactName},

A new lead matching your services just came in.

Type: ${lead.tradeType.toUpperCase()}
Urgency: ${lead.urgency.toUpperCase()}${lead.location ? `\nLocation: ${lead.location}${lead.locationState ? `, ${lead.locationState}` : ""}` : ""}
Quality Score: ${lead.qualityScore}/10

Summary: ${lead.problemSummary}

Claim for $${lead.estimatedValue} — exclusive to one buyer:
${claimUrl}

First to pay gets the full contact details. This lead won't be sold to anyone else after it's claimed.

— LeadFlow Team`,
    })
    notified++
  }

  await updateLeadStatus(leadId, "notified", { notifiedAt: new Date().toISOString() })
  return NextResponse.json({ notified, matching: matching.length })
}
