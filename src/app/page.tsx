"use client"
import { useEffect, useState } from "react"
import { getLeads, getBuyers } from "@/lib/storage"
import type { TradesLead, Buyer } from "@/types/leads"
import Link from "next/link"

const PLATFORMS = ["nextdoor", "facebook", "reddit", "hackernews", "google", "other"] as const

function ManualLeadModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [text, setText] = useState("")
  const [platform, setPlatform] = useState<string>("nextdoor")
  const [sourceUrl, setSourceUrl] = useState("")
  const [authorHandle, setAuthorHandle] = useState("")
  const [location, setLocation] = useState("")
  const [locationState, setLocationState] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ qualified: boolean; score: number; summary: string } | null>(null)
  const [error, setError] = useState("")

  async function submit() {
    if (!text.trim()) { setError("Paste the post text."); return }
    setSubmitting(true); setError("")
    try {
      const res = await fetch("/api/leads/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, platform, sourceUrl, authorHandle, location, locationState }),
      })
      const data = await res.json() as { lead?: TradesLead; qualified?: boolean; error?: string }
      if (!res.ok || data.error) { setError(data.error ?? "Failed"); return }
      setResult({ qualified: data.qualified ?? false, score: data.lead?.qualityScore ?? 0, summary: data.lead?.problemSummary ?? "" })
      onSaved()
    } catch (e) { setError(String(e)) }
    finally { setSubmitting(false) }
  }

  const inp = "w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-sm text-[#f5f5f5] placeholder-[#525252] outline-none focus:border-emerald-500 transition-colors"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
      <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold">Log a manual lead</h2>
            <p className="text-xs text-[#525252] mt-0.5">Paste a post from Nextdoor, Facebook, or anywhere else</p>
          </div>
          <button onClick={onClose} className="text-[#525252] hover:text-[#f5f5f5] text-lg leading-none">✕</button>
        </div>

        {result ? (
          <div className={`rounded-xl p-4 space-y-2 ${result.qualified ? "bg-emerald-900/30 border border-emerald-800" : "bg-[#1a1a1a] border border-[#2a2a2a]"}`}>
            <p className={`text-sm font-semibold ${result.qualified ? "text-emerald-400" : "text-[#525252]"}`}>
              {result.qualified ? `✓ Qualified — ${result.score}/10` : `✗ Not qualified — ${result.score}/10`}
            </p>
            <p className="text-sm text-[#f5f5f5]">{result.summary}</p>
            {result.qualified && <p className="text-xs text-emerald-400">Lead saved — check the Qualified tab on /leads</p>}
            {!result.qualified && <p className="text-xs text-[#525252]">Score below 7 — saved as rejected</p>}
            <button onClick={onClose} className="px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-sm text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors mt-2">Done</button>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs text-[#a3a3a3] mb-1.5">Platform</label>
              <div className="flex gap-2 flex-wrap">
                {PLATFORMS.map(p => (
                  <button key={p} type="button" onClick={() => setPlatform(p)}
                    className={`px-3 py-1 text-xs rounded-lg border capitalize transition-colors ${platform === p ? "bg-emerald-900/40 border-emerald-700 text-emerald-400" : "bg-[#0a0a0a] border-[#2a2a2a] text-[#a3a3a3] hover:border-[#3a3a3a]"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#a3a3a3] mb-1">Post text *</label>
              <textarea
                value={text} onChange={e => setText(e.target.value)}
                placeholder="Paste the full post here — the more context the better for AI qualification"
                rows={5}
                className={`${inp} resize-none`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#a3a3a3] mb-1">City</label>
                <input className={inp} placeholder="Austin" value={location} onChange={e => setLocation(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-[#a3a3a3] mb-1">State</label>
                <input className={inp} placeholder="TX" maxLength={2} value={locationState} onChange={e => setLocationState(e.target.value.toUpperCase())} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#a3a3a3] mb-1">Author / handle</label>
                <input className={inp} placeholder="Jane M." value={authorHandle} onChange={e => setAuthorHandle(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-[#a3a3a3] mb-1">Source URL</label>
                <input className={inp} placeholder="nextdoor.com/..." value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} />
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-[#a3a3a3] border border-[#2a2a2a] hover:text-[#f5f5f5] transition-colors">Cancel</button>
              <button onClick={() => void submit()} disabled={submitting || !text.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 transition-colors">
                {submitting ? "Qualifying…" : "Qualify & Save"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [leads, setLeads] = useState<TradesLead[]>([])
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [scanning, setScanning] = useState(false)
  const [scanningFb, setScanningFb] = useState(false)
  const [scanResult, setScanResult] = useState<string>("")
  const [fbGroups, setFbGroups] = useState("")
  const [showFbInput, setShowFbInput] = useState(false)
  const [showManual, setShowManual] = useState(false)

  const reload = async () => {
    setLeads(await getLeads())
    setBuyers(await getBuyers(false))
  }

  useEffect(() => { void reload() }, [])

  async function runScan() {
    setScanning(true); setScanResult("")
    try {
      const res = await fetch("/api/scan", { method: "POST" })
      const data = await res.json() as { scanned: number; new: number; qualified: number }
      setScanResult(`Reddit/HN: found ${data.scanned} signals → ${data.new} new → ${data.qualified} qualified`)
      setLeads(await getLeads())
    } catch (e) { setScanResult(String(e)) }
    finally { setScanning(false) }
  }

  async function runFbScan() {
    const urls = fbGroups.split(/[\n,]+/).map(u => u.trim()).filter(Boolean)
    if (!urls.length) return alert("Paste at least one Facebook group URL")
    setScanningFb(true); setScanResult("")
    try {
      const res = await fetch("/api/scan-fb", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupUrls: urls }) })
      const data = await res.json() as { totalPosts: number; tradesPosts: number; new: number; qualified: number; error?: string }
      if (data.error) throw new Error(data.error)
      setScanResult(`Facebook: scanned ${data.totalPosts} posts → ${data.tradesPosts} trades-related → ${data.qualified} qualified`)
      setLeads(await getLeads())
    } catch (e) { setScanResult(String(e)) }
    finally { setScanningFb(false) }
  }

  const byStatus = {
    qualified: leads.filter(l => l.status === "qualified").length,
    outreach: leads.filter(l => l.status === "outreach_sent" || l.status === "intake_received").length,
    notified: leads.filter(l => l.status === "notified").length,
    claimed: leads.filter(l => l.status === "claimed").length,
  }

  const revenue = leads.filter(l => l.status === "claimed").reduce((sum, l) => sum + l.estimatedValue, 0)

  return (
    <div className="pt-20 pb-10 px-4 md:px-8 max-w-5xl mx-auto space-y-8">
      {showManual && <ManualLeadModal onClose={() => setShowManual(false)} onSaved={() => void reload()} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">LeadFlow</h1>
          <p className="text-sm text-[#a3a3a3] mt-0.5">Trades lead marketplace — HVAC · Plumbing · Electrical · Roofing</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowManual(true)} className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-[#a3a3a3] hover:text-[#f5f5f5] text-sm font-semibold rounded-lg transition-colors">
            + Log Lead
          </button>
          <button onClick={() => void runScan()} disabled={scanning} className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition-colors">
            {scanning ? "Scanning…" : "Scan Reddit/HN"}
          </button>
          <button onClick={() => setShowFbInput(v => !v)} className="px-4 py-2 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-colors">
            Scan FB Groups
          </button>
        </div>
      </div>

      {showFbInput && (
        <div className="bg-[#111] border border-blue-900/50 rounded-xl p-4 space-y-3">
          <p className="text-xs text-[#a3a3a3]">Paste Facebook neighborhood/community group URLs (one per line). Requires <code className="text-blue-400">APIFY_API_TOKEN</code> env var.</p>
          <textarea value={fbGroups} onChange={e => setFbGroups(e.target.value)} placeholder={"https://www.facebook.com/groups/atlantaneighbors\nhttps://www.facebook.com/groups/..."} rows={3} className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-sm text-[#f5f5f5] placeholder-[#525252] outline-none focus:border-blue-500 resize-none font-mono text-xs" />
          <button onClick={() => void runFbScan()} disabled={scanningFb} className="px-4 py-2 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors">
            {scanningFb ? "Scanning… (up to 90s)" : "Run Facebook Scan"}
          </button>
        </div>
      )}

      {scanResult && <div className="bg-emerald-900/30 border border-emerald-800 rounded-xl px-4 py-3 text-sm text-emerald-300">{scanResult}</div>}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-2xl font-bold text-emerald-400">${revenue}</div>
          <div className="text-xs text-[#a3a3a3] mt-1">Revenue</div>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-2xl font-bold text-emerald-400">{byStatus.claimed}</div>
          <div className="text-xs text-[#a3a3a3] mt-1">Claimed</div>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-400">{byStatus.qualified}</div>
          <div className="text-xs text-[#a3a3a3] mt-1">Qualified</div>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-2xl font-bold">{buyers.filter(b => b.active).length}</div>
          <div className="text-xs text-[#a3a3a3] mt-1">Active Buyers</div>
        </div>
      </div>

      {/* Pipeline */}
      <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4">Pipeline</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          {[
            { label: "Qualified", value: byStatus.qualified, color: "text-blue-400" },
            { label: "Outreach", value: byStatus.outreach, color: "text-yellow-400" },
            { label: "In cascade", value: byStatus.notified, color: "text-emerald-400" },
            { label: "Claimed", value: byStatus.claimed, color: "text-emerald-400" },
          ].map(s => (
            <div key={s.label}>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-[#525252] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Link href="/leads?status=qualified" className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 hover:border-emerald-800 transition-colors block">
          <div className="text-2xl font-bold text-blue-400">{byStatus.qualified}</div>
          <div className="text-sm font-semibold mt-1">Qualified Leads</div>
          <p className="text-xs text-[#525252] mt-1">Ready for outreach. Click to review and copy messages.</p>
        </Link>
        <Link href="/buyers" className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 hover:border-emerald-800 transition-colors block">
          <div className="text-2xl font-bold text-emerald-400">{buyers.filter(b => b.active).length}</div>
          <div className="text-sm font-semibold mt-1">Active Buyers</div>
          <p className="text-xs text-[#525252] mt-1">Professionals signed up to receive leads.</p>
        </Link>
      </div>
    </div>
  )
}
