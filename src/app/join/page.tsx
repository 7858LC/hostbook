"use client"
import { useState } from "react"
import Link from "next/link"
import type { TradeType } from "@/types/leads"

const TRADE_TYPES: { value: TradeType; label: string }[] = [
  { value: "hvac", label: "HVAC" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "roofing", label: "Roofing" },
  { value: "general", label: "General Contractor" },
]

type Step = "form" | "success"

export default function JoinPage() {
  const [step, setStep] = useState<Step>("form")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    businessName: "",
    contactName: "",
    email: "",
    phone: "",
    serviceTypes: [] as TradeType[],
    coverageState: "",
    coverageZips: "",
  })
  const [tos1, setTos1] = useState(false)
  const [tos2, setTos2] = useState(false)
  const [tos3, setTos3] = useState(false)

  function toggleType(t: TradeType) {
    setForm(f => ({
      ...f,
      serviceTypes: f.serviceTypes.includes(t)
        ? f.serviceTypes.filter(x => x !== t)
        : [...f.serviceTypes, t],
    }))
  }

  async function handleSubmit() {
    if (!form.businessName || !form.contactName || !form.email) {
      setError("Business name, contact name, and email are required.")
      return
    }
    if (form.serviceTypes.length === 0) {
      setError("Select at least one service type.")
      return
    }
    if (!tos1 || !tos2 || !tos3) {
      setError("Please accept all three terms to continue.")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/buyers/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          coverageZips: form.coverageZips.split(/[\s,]+/).map(z => z.trim()).filter(Boolean),
        }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok || data.error) { setError(data.error ?? "Signup failed. Try again."); return }
      setStep("success")
    } catch (e) {
      setError(String(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (step === "success") return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] flex items-center justify-center px-4">
      <div className="text-center max-w-md space-y-4">
        <p className="text-4xl">✅</p>
        <h1 className="text-2xl font-bold">You&apos;re in the network</h1>
        <p className="text-[#a3a3a3] text-sm leading-relaxed">
          We&apos;ll email you at <strong className="text-[#f5f5f5]">{form.email}</strong> the moment a qualified lead matching your service types comes in. First to claim it pays — and it&apos;s yours exclusively.
        </p>
        <p className="text-xs text-[#525252]">Check your spam folder and add our address to your contacts so you don&apos;t miss a lead.</p>
        <Link href="/" className="inline-block mt-4 text-sm text-emerald-400 hover:text-emerald-300 transition-colors">← Back to dashboard</Link>
      </div>
    </div>
  )

  const inp = "w-full px-3 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-sm text-[#f5f5f5] placeholder-[#525252] outline-none focus:border-emerald-500 transition-colors"

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] px-4 py-12">
      <div className="max-w-lg mx-auto space-y-8">

        {/* Header */}
        <div className="text-center space-y-2">
          <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">LeadFlow</p>
          <h1 className="text-3xl font-bold">Get trades leads in your area</h1>
          <p className="text-[#525252] text-sm max-w-sm mx-auto leading-relaxed">
            We scan Reddit, HN, and Facebook neighborhood groups for homeowners actively looking for help. You get notified. You pay only for leads you want.
          </p>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: "📡", label: "We scan", desc: "Reddit, HN, FB groups — 24/7" },
            { icon: "🤖", label: "AI qualifies", desc: "Only real service requests" },
            { icon: "📧", label: "You decide", desc: "Pay only for leads you want" },
          ].map(s => (
            <div key={s.label} className="bg-[#111] border border-[#1a1a1a] rounded-xl p-3 text-center">
              <p className="text-xl mb-1">{s.icon}</p>
              <p className="text-xs font-semibold">{s.label}</p>
              <p className="text-[10px] text-[#525252] mt-0.5">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-6 space-y-5">
          <h2 className="text-sm font-semibold text-[#f5f5f5]">Your business info</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#a3a3a3] mb-1">Business Name *</label>
              <input className={inp} placeholder="Acme HVAC LLC" value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-[#a3a3a3] mb-1">Your Name *</label>
              <input className={inp} placeholder="Mike Smith" value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#a3a3a3] mb-1">Email *</label>
              <input className={inp} type="email" placeholder="mike@acmehvac.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-[#a3a3a3] mb-1">Phone</label>
              <input className={inp} type="tel" placeholder="404-555-0192" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#a3a3a3] mb-2">Services You Offer *</label>
            <div className="flex gap-2 flex-wrap">
              {TRADE_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => toggleType(t.value)}
                  className={`px-3 py-1.5 text-xs rounded-lg border font-semibold transition-colors ${
                    form.serviceTypes.includes(t.value)
                      ? "bg-emerald-900/40 border-emerald-700 text-emerald-400"
                      : "bg-[#0a0a0a] border-[#2a2a2a] text-[#a3a3a3] hover:border-[#3a3a3a]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#a3a3a3] mb-1">Coverage State</label>
              <input className={inp} placeholder="TX" maxLength={2} value={form.coverageState} onChange={e => setForm(f => ({ ...f, coverageState: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label className="block text-xs text-[#a3a3a3] mb-1">Coverage Zip Codes</label>
              <input className={inp} placeholder="78701, 78702, 78703" value={form.coverageZips} onChange={e => setForm(f => ({ ...f, coverageZips: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* ToS */}
        <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-[#f5f5f5]">Before you join</h2>
          <p className="text-xs text-[#525252]">LeadFlow connects you with real people who publicly asked for help. Read and accept each item.</p>

          {[
            {
              state: tos1,
              set: setTos1,
              text: <>I understand that LeadFlow provides <strong className="text-[#f5f5f5]">lead signals</strong> — posts from real people seeking trades services. LeadFlow does not guarantee that any lead will result in a booked job or closed contract.</>,
            },
            {
              state: tos2,
              set: setTos2,
              text: <>I understand that all lead purchases are <strong className="text-[#f5f5f5]">final and non-refundable</strong>. Once I claim a lead and payment is confirmed, the contact details are delivered and the lead is removed from the marketplace.</>,
            },
            {
              state: tos3,
              set: setTos3,
              text: <>I understand that I am responsible for my own outreach, licensing, and service delivery. LeadFlow is a <strong className="text-[#f5f5f5]">lead marketplace only</strong> and is not a party to any transaction between me and a homeowner.</>,
            },
          ].map((item, i) => (
            <label key={i} className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={item.state}
                onChange={e => item.set(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-emerald-500 flex-shrink-0"
              />
              <span className="text-sm text-[#a3a3a3] group-hover:text-[#f5f5f5] transition-colors leading-relaxed">
                {item.text}
              </span>
            </label>
          ))}
        </div>

        {error && <p className="text-sm text-red-400 text-center">{error}</p>}

        <button
          onClick={() => void handleSubmit()}
          disabled={submitting}
          className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Joining…" : "Join LeadFlow — Get notified of leads →"}
        </button>

        <p className="text-center text-xs text-[#525252]">
          Free to join. You only pay when you choose to claim a lead ($50–$150 per lead).
        </p>
      </div>
    </div>
  )
}
