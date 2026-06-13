"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

interface LeadTeaser {
  tradeType: string
  urgency: string
  location?: string
  locationState?: string
  status: string
}

type Step = "form" | "done" | "unavailable"

export default function IntakePage() {
  const { leadId } = useParams<{ leadId: string }>()
  const [lead, setLead] = useState<LeadTeaser | null>(null)
  const [step, setStep] = useState<Step>("form")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch(`/api/leads/${leadId}`)
      .then(r => r.json())
      .then((d: LeadTeaser) => {
        if (d.status === "claimed" || d.status === "expired") setStep("unavailable")
        setLead(d)
      })
      .catch(() => setStep("unavailable"))
  }, [leadId])

  async function handleSubmit() {
    if (!name.trim() || !phone.trim()) { setError("Both fields are required."); return }
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch(`/api/intake/${leadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok || data.error) { setError(data.error ?? "Something went wrong."); return }
      setStep("done")
    } catch (e) {
      setError(String(e))
    } finally {
      setSubmitting(false)
    }
  }

  const inp = "w-full px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-base text-[#f5f5f5] placeholder-[#525252] outline-none focus:border-emerald-500 transition-colors"

  if (step === "unavailable") return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="text-center space-y-3">
        <p className="text-lg font-semibold text-[#f5f5f5]">This offer is no longer available</p>
        <p className="text-sm text-[#525252]">We've already matched this request with a contractor. Sorry about that.</p>
      </div>
    </div>
  )

  if (step === "done") return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-sm">
        <p className="text-3xl">✅</p>
        <p className="text-xl font-bold text-[#f5f5f5]">You're all set</p>
        <p className="text-sm text-[#a3a3a3] leading-relaxed">
          A licensed contractor in your area will reach out to you directly within 30 minutes. Check your phone.
        </p>
      </div>
    </div>
  )

  const city = lead ? [lead.location, lead.locationState].filter(Boolean).join(", ") : ""
  const tradeLabel = lead?.tradeType === "hvac" ? "HVAC" : lead?.tradeType ? lead.tradeType.charAt(0).toUpperCase() + lead.tradeType.slice(1) : "Contractor"

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <p className="text-sm text-[#525252]">
            {city ? `${tradeLabel} contractor available in ${city}` : `${tradeLabel} contractor available in your area`}
          </p>
          <h1 className="text-2xl font-bold">How do we reach you?</h1>
          <p className="text-sm text-[#525252]">A contractor will call or text within 30 minutes.</p>
        </div>

        <div className="space-y-3">
          <input
            className={inp}
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            autoComplete="name"
          />
          <input
            className={inp}
            type="tel"
            placeholder="Phone number"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </div>

        {error && <p className="text-sm text-red-400 text-center">{error}</p>}

        <button
          onClick={() => void handleSubmit()}
          disabled={submitting || !name || !phone}
          className="w-full py-3.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Submitting…" : "Connect me with a contractor →"}
        </button>

        <p className="text-center text-xs text-[#525252]">
          Your info is shared with one contractor only. No spam.
        </p>
      </div>
    </div>
  )
}
