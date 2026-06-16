"use client"
export const dynamic = "force-dynamic"
import { useEffect, useState } from "react"
import { createBrowserSupabase } from "@/lib/auth"
import { getLeads, getBuyers } from "@/lib/storage"
import type { TradesLead, Buyer } from "@/types/leads"
import type { User } from "@supabase/supabase-js"

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
}

export default function PortalPage() {
  const [user, setUser] = useState<User | null>(null)
  const [buyer, setBuyer] = useState<Buyer | null>(null)
  const [leads, setLeads] = useState<TradesLead[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabase()
      if (!supabase) { setLoading(false); return }
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (!user?.email) { setLoading(false); return }

      const buyers = await getBuyers(false)
      const b = buyers.find(b => b.email.toLowerCase() === user.email!.toLowerCase()) ?? null
      setBuyer(b)

      if (b) {
        const all = await getLeads()
        setLeads(all.filter(l => l.claimedBy === b.id && l.status === "claimed"))
      }
      setLoading(false)
    }
    void load()
  }, [])

  async function signOut() {
    const supabase = createBrowserSupabase()
    if (supabase) await supabase.auth.signOut()
    window.location.href = "/login"
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <p className="text-[#525252] text-sm">Loading…</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] px-4 py-10 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-1">LeadFlow</p>
          <h1 className="text-2xl font-bold">
            {buyer ? buyer.businessName : "Contractor Portal"}
            {buyer?.badge === "verified" && <span className="ml-2 text-sm px-2 py-0.5 rounded bg-amber-900/40 text-amber-400 border border-amber-800/50">🏅 Verified</span>}
          </h1>
          <p className="text-sm text-[#525252] mt-0.5">{user?.email}</p>
        </div>
        <button onClick={() => void signOut()} className="text-xs text-[#525252] hover:text-[#a3a3a3] transition-colors border border-[#2a2a2a] px-3 py-1.5 rounded-lg">
          Sign out
        </button>
      </div>

      {!buyer && (
        <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 text-center space-y-3 mb-6">
          <p className="text-lg font-semibold">Not registered yet</p>
          <p className="text-sm text-[#a3a3a3]">Your email isn&apos;t linked to a LeadFlow buyer account. Sign up to start receiving leads.</p>
          <a href="/join" className="inline-block px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-500 transition-colors">Join LeadFlow →</a>
        </div>
      )}

      {buyer && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
              <div className="text-2xl font-bold text-emerald-400">{buyer.totalLeadsClaimed}</div>
              <div className="text-xs text-[#a3a3a3] mt-1">Total leads claimed</div>
            </div>
            <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
              <div className="text-2xl font-bold text-emerald-400">{buyer.serviceTypes.map(s => s.toUpperCase()).join(", ")}</div>
              <div className="text-xs text-[#a3a3a3] mt-1">Service types</div>
            </div>
          </div>

          {/* Claimed leads */}
          <h2 className="text-sm font-semibold text-[#a3a3a3] uppercase tracking-wider mb-3">Your Claimed Leads</h2>
          {leads.length === 0 ? (
            <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-8 text-center">
              <p className="text-[#525252] text-sm">No leads claimed yet. Watch your inbox for notifications.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leads.map(lead => (
                <div key={lead.id} className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4 space-y-3">
                  <div className="flex gap-2 flex-wrap items-center">
                    <span className={`text-xs px-2 py-1 rounded-lg font-bold uppercase ${URGENCY_COLOR[lead.urgency] ?? URGENCY_COLOR.unknown}`}>{lead.urgency}</span>
                    <span className={`text-xs px-2 py-1 rounded-lg font-bold uppercase ${TRADE_COLOR[lead.tradeType] ?? ""}`}>{lead.tradeType}</span>
                    {lead.location && <span className="text-xs text-[#525252]">📍 {lead.location}{lead.locationState ? `, ${lead.locationState}` : ""}</span>}
                    <span className="ml-auto text-xs text-[#525252]">{new Date(lead.claimedAt ?? lead.discoveredAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-[#f5f5f5] leading-relaxed">{lead.problemSummary}</p>
                  {(lead.homeownerName || lead.homeownerPhone) && (
                    <div className="bg-emerald-900/20 border border-emerald-800/40 rounded-lg p-3 space-y-1">
                      <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Contact</p>
                      {lead.homeownerName && <p className="text-sm text-[#f5f5f5]">{lead.homeownerName}</p>}
                      {lead.homeownerPhone && <a href={`tel:${lead.homeownerPhone}`} className="text-sm text-emerald-400 hover:text-emerald-300">{lead.homeownerPhone}</a>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
