import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { updateLeadStatus, getBuyers, getLeads } from "@/lib/storage"
import { Resend } from "resend"

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

    const leads = await getLeads()
    const lead = leads.find(l => l.id === leadId)
    if (!lead) return NextResponse.json({ ok: true })

    const buyers = await getBuyers(false)
    const buyer = buyers.find(b => b.email === buyerEmail)

    await updateLeadStatus(leadId, "claimed", {
      claimedBy: buyer?.id ?? buyerEmail,
      claimedAt: new Date().toISOString(),
      stripeSessionId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
    })

    const apiKey = process.env.RESEND_API_KEY
    if (apiKey && buyer) {
      const resend = new Resend(apiKey)
      const from = process.env.RESEND_FROM_EMAIL ?? "LeadFlow <onboarding@resend.dev>"
      await resend.emails.send({
        from,
        to: buyerEmail,
        subject: `Your lead is ready — ${lead.problemSummary.slice(0, 50)}`,
        text: `Hi ${buyer.contactName},

Payment confirmed. Here are your full lead details:

Problem: ${lead.problemSummary}
Type: ${lead.tradeType.toUpperCase()}
Urgency: ${lead.urgency}${lead.location ? `\nLocation: ${lead.location}${lead.locationState ? `, ${lead.locationState}` : ""}` : ""}

Original post: ${lead.sourceUrl}
Posted by: ${lead.authorHandle ?? "unknown"}

Full context:
${lead.rawText}

This lead is exclusive to you — it will not be sold to other buyers.

Good luck closing!
— LeadFlow Team`,
      })
    }
  }

  return NextResponse.json({ ok: true })
}
