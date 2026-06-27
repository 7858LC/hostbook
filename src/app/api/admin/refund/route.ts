import { NextRequest, NextResponse } from "next/server"
import { isAdminRequest } from "@/lib/auth-server"
import { getBuyers, getLeads } from "@/lib/storage"
import { stripe } from "@/lib/stripe"

export async function POST(req: NextRequest) {
  if (!await isAdminRequest()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 })

  const { buyerId } = await req.json() as { buyerId: string }

  const [buyers, claimedLeads] = await Promise.all([getBuyers(false), getLeads("claimed")])
  const buyer = buyers.find(b => b.id === buyerId)
  if (!buyer) return NextResponse.json({ error: "Buyer not found" }, { status: 404 })

  const buyerLeads = claimedLeads
    .filter(l => (l.claimedBy === buyerId || l.claimedBy === buyer.email) && l.stripeSessionId)
    .sort((a, b) => new Date(b.claimedAt ?? 0).getTime() - new Date(a.claimedAt ?? 0).getTime())

  if (!buyerLeads.length) return NextResponse.json({ error: "No refundable leads found" }, { status: 404 })

  const lead = buyerLeads[0]
  try {
    await stripe.refunds.create({ payment_intent: lead.stripeSessionId! })
    return NextResponse.json({ ok: true, leadId: lead.id, amount: lead.estimatedValue })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
