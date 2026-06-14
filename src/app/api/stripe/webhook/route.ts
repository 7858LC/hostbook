import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { updateLeadStatus, getBuyers, getLead, saveBuyer } from "@/lib/storage"
import { Resend } from "resend"

const BADGE_THRESHOLD = 5

export async function POST(req: NextRequest) {
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 })

  const body = await req.text()
  const sig = req.headers.get("stripe-signature") ?? ""
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? ""

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch {
    return NextResponse.json({ error: "Webhook signature invalid" }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as { metadata?: { leadId?: string; buyerEmail?: string }; payment_intent?: string | { id: string } }
    const { leadId, buyerEmail } = session.metadata ?? {}
    if (!leadId || !buyerEmail) return NextResponse.json({ ok: true })

    const lead = await getLead(leadId)
    if (!lead) return NextResponse.json({ ok: true })

    const buyers = await getBuyers(false)
    const buyer = buyers.find(b => b.email === buyerEmail)

    await updateLeadStatus(leadId, "claimed", {
      claimedBy: buyer?.id ?? buyerEmail,
      claimedAt: new Date().toISOString(),
      stripeSessionId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
    })

    const apiKey = process.env.RESEND_API_KEY
    const resend = apiKey ? new Resend(apiKey) : null
    const from = process.env.RESEND_FROM_EMAIL ?? "LeadFlow <onboarding@resend.dev>"

    // Check and award badge
    let justEarnedBadge = false
    if (buyer) {
      const newCount = (buyer.totalLeadsClaimed ?? 0) + 1
      const earnedBadge = newCount >= BADGE_THRESHOLD && !buyer.badge
      await saveBuyer({
        ...buyer,
        totalLeadsClaimed: newCount,
        ...(earnedBadge ? { badge: "verified", verifiedAt: new Date().toISOString() } : {}),
      })
      justEarnedBadge = earnedBadge
    }

    // Deliver full lead details to buyer
    if (resend && buyer) {
      const hasContact = lead.homeownerName || lead.homeownerPhone

      await resend.emails.send({
        from,
        to: buyerEmail,
        subject: `Lead ready — ${lead.problemSummary.slice(0, 50)}`,
        text: `Hi ${buyer.contactName},

Payment confirmed. Here are your full lead details.

${hasContact ? `CONTACT INFO
-----------
Name: ${lead.homeownerName ?? "not provided"}
Phone: ${lead.homeownerPhone ?? "not provided"}

Call or text them now — they're expecting to hear from you within 30 minutes.

` : ""}PROBLEM
-------
${lead.problemSummary}
Type: ${lead.tradeType.toUpperCase()}
Urgency: ${lead.urgency}${lead.location ? `\nLocation: ${lead.location}${lead.locationState ? `, ${lead.locationState}` : ""}` : ""}

ORIGINAL POST
-------------
${lead.rawText}
Source: ${lead.sourceUrl}
Posted by: ${lead.authorHandle ?? "unknown"}

This lead is exclusive to you.

${justEarnedBadge ? `🏅 YOU EARNED VERIFIED STATUS\nYou've closed ${BADGE_THRESHOLD} leads on LeadFlow. You're now a Verified contractor — you'll appear first in future cascades.\n\n` : ""}Good luck!
— LeadFlow`,
      })

      // Send badge congrats separately if earned
      if (justEarnedBadge) {
        await resend.emails.send({
          from,
          to: buyerEmail,
          subject: "🏅 You're now LeadFlow Verified",
          text: `Hi ${buyer.contactName},

You've claimed ${BADGE_THRESHOLD} leads on LeadFlow — that earns you Verified contractor status.

What this means:
- You appear first in new lead cascades for your service types
- Future homeowners see "Verified Contractor" when they receive your contact info
- You're in the top tier of our network

Keep it up.

— LeadFlow Team`,
        })
      }
    }
  }

  return NextResponse.json({ ok: true })
}
