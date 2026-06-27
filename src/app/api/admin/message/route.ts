import { NextRequest, NextResponse } from "next/server"
import { isAdminRequest } from "@/lib/auth-server"
import { Resend } from "resend"

export async function POST(req: NextRequest) {
  if (!await isAdminRequest()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { to, subject, body } = await req.json() as { to: string; subject: string; body: string }
  if (!to || !subject || !body) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: "Email not configured" }, { status: 503 })

  const resend = new Resend(apiKey)
  const from = process.env.RESEND_FROM_EMAIL ?? "LeadFlow <onboarding@resend.dev>"
  await resend.emails.send({ from, to, subject, text: body })
  return NextResponse.json({ ok: true })
}
