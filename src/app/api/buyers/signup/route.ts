import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { saveBuyer, getBuyers } from "@/lib/storage"
import { Resend } from "resend"
import type { TradeType } from "@/types/leads"

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    businessName: string
    contactName: string
    email: string
    phone?: string
    licenseNumber?: string
    serviceTypes: TradeType[]
    coverageState?: string
    coverageZips: string[]
  }

  if (!body.businessName || !body.contactName || !body.email) {
    return NextResponse.json({ error: "businessName, contactName, and email are required" }, { status: 400 })
  }
  if (!body.licenseNumber?.trim()) {
    return NextResponse.json({ error: "Contractor license number is required" }, { status: 400 })
  }
  if (!body.serviceTypes?.length) {
    return NextResponse.json({ error: "At least one service type is required" }, { status: 400 })
  }

  // Prevent duplicate emails
  const existing = await getBuyers(false)
  if (existing.some(b => b.email.toLowerCase() === body.email.toLowerCase())) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 })
  }

  const buyer = {
    id: nanoid(10),
    businessName: body.businessName,
    contactName: body.contactName,
    email: body.email.toLowerCase(),
    phone: body.phone,
    licenseNumber: body.licenseNumber?.trim(),
    serviceTypes: body.serviceTypes,
    coverageZips: body.coverageZips,
    coverageState: body.coverageState,
    active: true,
    totalLeadsClaimed: 0,
    createdAt: new Date().toISOString(),
  }

  await saveBuyer(buyer)

  // Send welcome email
  const apiKey = process.env.RESEND_API_KEY
  if (apiKey) {
    const resend = new Resend(apiKey)
    const from = process.env.RESEND_FROM_EMAIL ?? "LeadFlow <onboarding@resend.dev>"
    await resend.emails.send({
      from,
      to: buyer.email,
      subject: "You're in — LeadFlow leads are coming your way",
      text: `Hi ${buyer.contactName},

Welcome to LeadFlow! You're now registered to receive ${body.serviceTypes.map(s => s.toUpperCase()).join(", ")} leads${body.coverageState ? ` in ${body.coverageState}` : ""}.

How it works:
1. We scan Reddit, HackerNews, and Facebook neighborhood groups 24/7
2. When a homeowner posts asking for ${body.serviceTypes[0].toUpperCase()} help, our AI qualifies the lead
3. You get an email with a summary and a claim link
4. First contractor to pay gets the full contact details — exclusively

Lead prices: $50–$150 depending on urgency. Emergency jobs (same-day need) are $150. Planned work is $50–$75.

There's no monthly fee. You only pay for leads you choose to claim.

Add this email address to your contacts so our alerts don't hit spam.

— LeadFlow Team`,
    })
  }

  return NextResponse.json({ ok: true, buyerId: buyer.id })
}
