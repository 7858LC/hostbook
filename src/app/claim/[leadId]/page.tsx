"use client"
import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"

const URGENCY_LABEL: Record<string, string> = {
  emergency: "Emergency",
  urgent: "Urgent",
  planned: "Planned",
  unknown: "Unspecified",
}
const URGENCY_COLOR: Record<string, string> = {
  emergency: "text-red-400 bg-red-900/30",
  urgent: "text-yellow-400 bg-yellow-900/30",
  planned: "text-blue-400 bg-blue-900/30",
  unknown: "text-[#525252] bg-[#1a1a1a]",
}
const TRADE_COLOR: Record<string, string> = {
  hvac: "text-emerald-400 bg-emerald-900/30",
  plumbing: "text-blue-400 bg-blue-900/30",
  electrical: "text-yellow-400 bg-yellow-900/30",
  roofing: "text-purple-400 bg-purple-900/30",
  general: "text-[#a3a3a3] bg-[#1a1a1a]",
  unknown: "text-[#525252] bg-[#1a1a1a]",
}

interface LeadTeaser {
  id: string
  tradeType: string
  urgency: string
  location?: string
  locationState?: string
  problemSummary: string
  estimatedValue: number
  status: string
}

export default function ClaimPage() {
  const { leadId } = useParams<{ leadId: string }>()
  const sp = useSearchParams()
  const buyerEmail = sp.get("email") ?? ""

  const [lead, setLead] = useState<LeadTeaser | null>(null)
  const [loading, setLoading] = useState(true)
  const [tos1, setTos1] = useState(false)
  const [tos2, setTos2] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch(`/api/leads/${leadId}`)
      .then(r => r.json())
      .then((d: LeadTeaser) => setLead(d))
      .catch(() => setError("Lead not found."))
      .finally(() => setLoading(false))
  }, [leadId])

  async function handleClaim() {
    if (!buyerEmail) { setError("Missing buyer email — use the link from your notification email."); return }
    if (!tos1 || !tos2) { setError("Please accept both terms before continuing."); return }
    setPaying(true)
    setError("")
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, buyerEmail }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (data.error) { setError(data.error); setPaying(false); return }
      if (data.url) window.location.href = data.url
    } catch (e) {
      setError(String(e))
      setPaying(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-[#525252] text-sm">Loading lead…</div>
    </div>
  )

  if (!lead || error === "Lead not found.") return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-lg font-semibold text-[#f5f5f5] mb-2">Lead unavailable</p>
        <p className="text-sm text-[#525252]">This lead may have already been claimed or removed.</p>
      </div>
    </div>
  )

  if (lead.status === "claimed") return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-2xl mb-3">🔒</p>
        <p className="text-lg font-semibold text-[#f5f5f5] mb-2">Already claimed</p>
        <p className="text-sm text-[#525252]">Another contractor got here first. Watch your inbox for the next lead.</p>
      </div>
    </div>
  )

  const locationStr = [lead.location, lead.locationState].filter(Boolean).join(", ")

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] px-4 py-12 flex items-start justify-center">
      <div className="w-full max-w-lg space-y-6">

        <div className="text-center">
          <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-2">LeadFlow — Exclusive Lead</p>
          <h1 className="text-2xl font-bold">Claim this lead</h1>
          <p className="text-sm text-[#525252] mt-1">First to pay gets it. Not sold to anyone else after claim.</p>
        </div>

        {/* Lead teaser card */}
        <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2.5 py-1 rounded-lg font-bold uppercase ${URGENCY_COLOR[lead.urgency] ?? URGENCY_COLOR.unknown}`}>
              {URGENCY_LABEL[lead.urgency] ?? lead.urgency}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-lg font-bold uppercase ${TRADE_COLOR[lead.tradeType] ?? TRADE_COLOR.unknown}`}>
              {lead.tradeType.toUpperCase()}
            </span>
            {locationStr && <span className="text-xs text-[#525252]">📍 {locationStr}</span>}
          </div>
          <p className="text-sm leading-relaxed">{lead.problemSummary}</p>
          <div className="border-t border-[#1a1a1a] pt-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#525252]">Claim price</p>
              <p className="text-2xl font-bold text-emerald-400">${lead.estimatedValue}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#525252]">Exclusivity</p>
              <p className="text-sm font-semibold">100% exclusive</p>
            </div>
          </div>
        </div>

        {/* ToS checkboxes */}
        <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-5 space-y-4">
          <p className="text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider">Before you pay</p>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={tos1}
              onChange={e => setTos1(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-emerald-500 flex-shrink-0"
            />
            <span className="text-sm text-[#a3a3a3] group-hover:text-[#f5f5f5] transition-colors leading-relaxed">
              I understand I am purchasing a <strong className="text-[#f5f5f5]">verified lead signal</strong> — a real person who publicly asked for trades help. I am not buying a guaranteed job or closed contract.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={tos2}
              onChange={e => setTos2(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-emerald-500 flex-shrink-0"
            />
            <span className="text-sm text-[#a3a3a3] group-hover:text-[#f5f5f5] transition-colors leading-relaxed">
              I understand all lead sales are <strong className="text-[#f5f5f5]">final and non-refundable</strong>. Once claimed, the full contact details are delivered immediately by email.
            </span>
          </label>
        </div>

        {error && <p className="text-sm text-red-400 text-center">{error}</p>}

        <button
          onClick={() => void handleClaim()}
          disabled={paying || !tos1 || !tos2}
          className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: tos1 && tos2 ? "#059669" : "#1a1a1a" }}
        >
          {paying ? "Redirecting to payment…" : `Claim for $${lead.estimatedValue} →`}
        </button>

        <p className="text-center text-xs text-[#525252]">
          Secured by Stripe. Your card is never stored by LeadFlow.
        </p>
      </div>
    </div>
  )
}
