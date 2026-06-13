import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

export async function POST(req: NextRequest) {
  const { to, subject, message } = await req.json() as { to: string; subject?: string; message: string }
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: "Email not configured — add RESEND_API_KEY to Vercel env vars" }, { status: 503 })
  const resend = new Resend(apiKey)
  const from = process.env.RESEND_FROM_EMAIL ?? "ICN <onboarding@resend.dev>"
  const { data, error } = await resend.emails.send({ from, to, subject: subject ?? "Reaching out", text: message })
  if (error) return NextResponse.json({ error: String(error) }, { status: 500 })
  return NextResponse.json({ sent: true, id: data?.id })
}
