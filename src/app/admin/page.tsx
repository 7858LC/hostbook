"use client"
import { useEffect, useState, useCallback } from "react"
import type { Buyer } from "@/types/leads"

interface BuyerUsage {
  count: number
  tradeTypes: Record<string, number>
}

interface AdminData {
  buyers: Buyer[]
  revenue: number
  activeCount: number
  usageByBuyer: Record<string, BuyerUsage>
  claimedCount: number
}

function MessageModal({ buyer, onClose }: { buyer: Buyer; onClose: () => void }) {
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const inp = "w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-sm text-[#f5f5f5] placeholder-[#525252] outline-none focus:border-emerald-500 transition-colors"

  async function send() {
    if (!subject.trim() || !body.trim()) return
    setSending(true)
    try {
      const res = await fetch("/api/admin/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: buyer.email, subject, body }),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        throw new Error(d.error ?? "Failed")
      }
      setResult({ ok: true, msg: "Email sent." })
    } catch (e) {
      setResult({ ok: false, msg: e instanceof Error ? e.message : String(e) })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
      <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold">Message {buyer.businessName}</h2>
            <p className="text-xs text-[#525252] mt-0.5">{buyer.email}</p>
          </div>
          <button onClick={onClose} className="text-[#525252] hover:text-[#f5f5f5] text-lg leading-none transition-colors">✕</button>
        </div>

        {result ? (
          <div className={`rounded-xl p-4 text-sm ${result.ok ? "bg-emerald-900/30 border border-emerald-800 text-emerald-400" : "bg-red-900/30 border border-red-800 text-red-400"}`}>
            {result.msg}
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs text-[#a3a3a3] mb-1">Subject</label>
              <input className={inp} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Update from LeadFlow" />
            </div>
            <div>
              <label className="block text-xs text-[#a3a3a3] mb-1">Message</label>
              <textarea className={`${inp} resize-none`} rows={6} value={body} onChange={e => setBody(e.target.value)} placeholder={`Hi ${buyer.contactName || buyer.businessName},\n\n`} />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-[#a3a3a3] border border-[#2a2a2a] hover:text-[#f5f5f5] transition-colors">
                Cancel
              </button>
              <button
                onClick={() => void send()}
                disabled={sending || !subject.trim() || !body.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 transition-colors"
              >
                {sending ? "Sending…" : "Send Email"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState("")
  const [search, setSearch] = useState("")
  const [msgTarget, setMsgTarget] = useState<Buyer | null>(null)
  const [actioning, setActioning] = useState<string | null>(null)
  const [notices, setNotices] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/data")
      if (!res.ok) throw new Error("Unauthorized or server error")
      setData(await res.json() as AdminData)
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  function notice(id: string, msg: string) {
    setNotices(n => ({ ...n, [id]: msg }))
    setTimeout(() => setNotices(n => { const next = { ...n }; delete next[id]; return next }), 4000)
  }

  async function toggleActive(buyer: Buyer) {
    setActioning(buyer.id)
    try {
      const res = await fetch("/api/admin/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerId: buyer.id, active: !buyer.active }),
      })
      if (!res.ok) throw new Error("Failed")
      notice(buyer.id, buyer.active ? "Paused" : "Reactivated")
      await load()
    } catch {
      notice(buyer.id, "Action failed")
    } finally {
      setActioning(null)
    }
  }

  async function refund(buyer: Buyer) {
    if (!confirm(`Refund the most recent lead claim for ${buyer.businessName}? This cannot be undone.`)) return
    setActioning(buyer.id)
    try {
      const res = await fetch("/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerId: buyer.id }),
      })
      const d = await res.json() as { ok?: boolean; amount?: number; error?: string }
      if (!res.ok) throw new Error(d.error ?? "Failed")
      notice(buyer.id, `Refunded $${d.amount}`)
    } catch (e) {
      notice(buyer.id, e instanceof Error ? e.message : "Refund failed")
    } finally {
      setActioning(null)
    }
  }

  const filtered = (data?.buyers ?? []).filter(b => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      b.businessName.toLowerCase().includes(q) ||
      b.email.toLowerCase().includes(q) ||
      b.contactName.toLowerCase().includes(q)
    )
  })

  if (loading) {
    return (
      <div className="pt-20 px-4 md:px-8 max-w-6xl mx-auto">
        <div className="h-64 flex items-center justify-center text-sm text-[#525252]">Loading…</div>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="pt-20 px-4 md:px-8 max-w-6xl mx-auto">
        <div className="h-64 flex items-center justify-center text-sm text-red-400">{fetchError}</div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="pt-20 pb-10 px-4 md:px-8 max-w-6xl mx-auto space-y-8">
      {msgTarget && <MessageModal buyer={msgTarget} onClose={() => setMsgTarget(null)} />}

      <div>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-sm text-[#a3a3a3] mt-0.5">Subscriber management and revenue overview</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-2xl font-bold text-emerald-400">${data.revenue.toLocaleString()}</div>
          <div className="text-xs text-[#a3a3a3] mt-1">Total Revenue</div>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-2xl font-bold text-emerald-400">{data.activeCount}</div>
          <div className="text-xs text-[#a3a3a3] mt-1">Active Subscribers</div>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-2xl font-bold">{data.buyers.length}</div>
          <div className="text-xs text-[#a3a3a3] mt-1">Total Buyers</div>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-400">{data.claimedCount}</div>
          <div className="text-xs text-[#a3a3a3] mt-1">Leads Claimed</div>
        </div>
      </div>

      {/* Subscriber table */}
      <div className="bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-sm font-semibold">Subscribers ({data.buyers.length})</h2>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="w-52 px-3 py-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-sm text-[#f5f5f5] placeholder-[#525252] outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-[#1a1a1a]">
                {["Business", "Email", "Status", "Leads Claimed", "Top Trades", "Member Since", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-[#525252] uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-xs text-[#525252]">
                    {search ? "No subscribers match your search." : "No subscribers yet."}
                  </td>
                </tr>
              )}
              {filtered.map(buyer => {
                const usage = data.usageByBuyer[buyer.id] ?? data.usageByBuyer[buyer.email]
                const topTrades = usage
                  ? Object.entries(usage.tradeTypes).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t)
                  : buyer.serviceTypes.slice(0, 3)
                const busy = actioning === buyer.id
                const note = notices[buyer.id]

                return (
                  <tr key={buyer.id} className="border-b border-[#0f0f0f] hover:bg-[#0d0d0d] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#f5f5f5] leading-tight">{buyer.businessName}</div>
                      {buyer.contactName && <div className="text-xs text-[#525252] mt-0.5">{buyer.contactName}</div>}
                      {buyer.badge === "verified" && (
                        <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-400 border border-amber-800/50">
                          🏅 Verified
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#a3a3a3] whitespace-nowrap">{buyer.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-1 rounded font-medium whitespace-nowrap ${buyer.active ? "bg-emerald-900/40 text-emerald-400 border border-emerald-900" : "bg-[#1a1a1a] text-[#525252] border border-[#2a2a2a]"}`}>
                        {buyer.active ? "Active" : "Paused"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#f5f5f5]">{buyer.totalLeadsClaimed}</div>
                      {usage && usage.count !== buyer.totalLeadsClaimed && (
                        <div className="text-[10px] text-[#525252] mt-0.5">{usage.count} paid</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {topTrades.map(t => (
                          <span key={t} className="px-1.5 py-0.5 text-[9px] bg-[#1a1a1a] text-[#a3a3a3] rounded uppercase border border-[#2a2a2a] whitespace-nowrap">{t}</span>
                        ))}
                        {buyer.serviceTypes.length > 3 && (
                          <span className="text-[9px] text-[#525252]">+{buyer.serviceTypes.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#525252] whitespace-nowrap">
                      {new Date(buyer.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => setMsgTarget(buyer)}
                          className="text-xs px-2.5 py-1 rounded border border-[#2a2a2a] text-[#a3a3a3] hover:text-[#f5f5f5] hover:border-[#3a3a3a] transition-colors whitespace-nowrap"
                        >
                          Message
                        </button>
                        <button
                          onClick={() => void toggleActive(buyer)}
                          disabled={busy}
                          className={`text-xs px-2.5 py-1 rounded border transition-colors disabled:opacity-40 whitespace-nowrap ${buyer.active ? "border-yellow-900/60 text-yellow-500 hover:bg-yellow-900/20" : "border-emerald-900/60 text-emerald-500 hover:bg-emerald-900/20"}`}
                        >
                          {busy ? "…" : buyer.active ? "Pause" : "Resume"}
                        </button>
                        {buyer.totalLeadsClaimed > 0 && (
                          <button
                            onClick={() => void refund(buyer)}
                            disabled={busy}
                            className="text-xs px-2.5 py-1 rounded border border-red-900/50 text-red-500 hover:bg-red-900/20 transition-colors disabled:opacity-40 whitespace-nowrap"
                          >
                            Refund
                          </button>
                        )}
                        {note && <span className="text-[10px] text-[#525252] ml-1">{note}</span>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
