import { Resend } from "resend"
import { getLead, updateLeadStatus, getBuyers } from "@/lib/storage"
import { CASCADE_TIMEOUT_MINUTES } from "@/lib/outreach"
import type { TradesLead, Buyer } from "@/types/leads"

function buildBuyerList(lead: TradesLead, buyers: Buyer[]): string[] {
  return buyers
    .filter(b =>
      b.active &&
      (b.serviceTypes.includes(lead.tradeType as "hvac" | "plumbing" | "electrical" | "roofing" | "general") ||
        b.serviceTypes.includes("general"))
    )
    .sort((a, b) => b.totalLeadsClaimed - a.totalLeadsClaimed) // most active buyers first
    .slice(0, 5)
    .map(b => b.id)
}

async function emailBuyer(lead: TradesLead, buyer: Buyer, position: number): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return
  const resend = new Resend(apiKey)
  const from = process.env.RESEND_FROM_EMAIL ?? "LeadFlow <onboarding@resend.dev>"
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3003"
  const claimUrl = `${appUrl}/claim/${lead.id}?email=${encodeURIComponent(buyer.email)}`
  const passUrl = `${appUrl}/api/cascade/pass?leadId=${lead.id}&buyerEmail=${encodeURIComponent(buyer.email)}`
  const timeoutMin = CASCADE_TIMEOUT_MINUTES[lead.urgency] ?? 60
  const urgencyTag = lead.urgency === "emergency" ? "🚨 Emergency" : lead.urgency === "urgent" ? "⚡ Urgent" : "Planned"

  await resend.emails.send({
    from,
    to: buyer.email,
    subject: `${urgencyTag} ${lead.tradeType.toUpperCase()} Lead${lead.location ? ` — ${lead.location}` : ""}`,
    text: `Hi ${buyer.contactName},

A homeowner reached out — they're actively looking for help right now.

Type: ${lead.tradeType.toUpperCase()}
Urgency: ${lead.urgency.toUpperCase()}${lead.location ? `\nLocation: ${lead.location}${lead.locationState ? `, ${lead.locationState}` : ""}` : ""}${lead.homeownerName ? `\nContact name: ${lead.homeownerName}` : ""}${lead.homeownerPhone ? `\nPhone: ${lead.homeownerPhone}` : ""}

Summary: ${lead.problemSummary}

Claim for $${lead.estimatedValue} — you'll get this phone number and name exclusively. ${position > 0 ? `(You're offer #${position + 1} — previous buyer passed.)` : "First offer."}

→ Claim: ${claimUrl}
→ Pass: ${passUrl}

You have ${timeoutMin} minutes before this moves to the next buyer.

— LeadFlow`,
  })
}

export async function startCascade(leadId: string): Promise<void> {
  const lead = await getLead(leadId)
  if (!lead) return

  const allBuyers = await getBuyers(false)
  const ordered = buildBuyerList(lead, allBuyers)
  if (!ordered.length) {
    await updateLeadStatus(leadId, "expired")
    return
  }

  const firstBuyer = allBuyers.find(b => b.id === ordered[0])
  if (firstBuyer) await emailBuyer(lead, firstBuyer, 0)

  await updateLeadStatus(leadId, "notified", {
    cascadeBuyerIds: ordered,
    cascadePosition: 0,
    cascadeNotifiedAt: new Date().toISOString(),
    notifiedAt: new Date().toISOString(),
  })
}

export async function advanceCascade(leadId: string): Promise<"advanced" | "expired" | "already_claimed" | "not_found"> {
  const lead = await getLead(leadId)
  if (!lead) return "not_found"
  if (lead.status === "claimed") return "already_claimed"

  const buyerIds = lead.cascadeBuyerIds ?? []
  const nextPos = (lead.cascadePosition ?? 0) + 1

  if (nextPos >= buyerIds.length) {
    await updateLeadStatus(leadId, "expired")
    return "expired"
  }

  const allBuyers = await getBuyers(false)
  const nextBuyer = allBuyers.find(b => b.id === buyerIds[nextPos])
  if (nextBuyer) {
    const enriched = await getLead(leadId) // re-fetch with any homeowner info
    await emailBuyer(enriched ?? lead, nextBuyer, nextPos)
  }

  await updateLeadStatus(leadId, "notified", {
    cascadePosition: nextPos,
    cascadeNotifiedAt: new Date().toISOString(),
  })
  return "advanced"
}

export async function checkAndAdvanceStaleLeads(): Promise<{ leadId: string; result: string }[]> {
  const { getLeads } = await import("@/lib/storage")
  const notified = await getLeads("notified")
  const now = Date.now()
  const results: { leadId: string; result: string }[] = []

  for (const lead of notified) {
    if (!lead.cascadeNotifiedAt) continue
    const ageMs = now - new Date(lead.cascadeNotifiedAt).getTime()
    const timeoutMs = (CASCADE_TIMEOUT_MINUTES[lead.urgency] ?? 60) * 60 * 1000
    if (ageMs >= timeoutMs) {
      const result = await advanceCascade(lead.id)
      results.push({ leadId: lead.id, result })
    }
  }
  return results
}
