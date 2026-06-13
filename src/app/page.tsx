"use client"
import { useEffect, useState } from "react"
import { getLeads, getBuyers } from "@/lib/storage"
import type { TradesLead, Buyer } from "@/types/leads"
import Link from "next/link"

export default function Dashboard() {
  const [leads, setLeads] = useState<TradesLead[]>([])
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<string>("")

  useEffect(() => {
    void getLeads().then(setLeads)
    void getBuyers(false).then(setBuyers)
  }, [])

  async function runScan() {
    setScanning(true); setScanResult("")
    try {
      const res = await fetch("/api/scan", { method: "POST" })
      const data = await res.json() as { scanned: number; new: number; qualified: number }
      setScanResult(`Found ${data.scanned} signals → ${data.new} new → ${data.qualified} qualified`)
      setLeads(await getLeads())
    } catch (e) { setScanResult(String(e)) }
    finally { setScanning(false) }
  }

  const byStatus = {
    raw: leads.filter(l => l.status === "raw").length,
    qualified: leads.filter(l => l.status === "qualified").length,
    available: leads.filter(l => l.status === "available").length,
    notified: leads.filter(l => l.status === "notified").length,
    claimed: leads.filter(l => l.status === "claimed").length,
    rejected: leads.filter(l => l.status === "rejected").length,
  }

  const revenue = leads.filter(l => l.status === "claimed").reduce((sum, l) => sum + l.estimatedValue, 0)

  return (
    <div className="pt-20 pb-10 px-4 md:px-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">LeadFlow</h1>
          <p className="text-sm text-[#a3a3a3] mt-0.5">Trades lead marketplace — HVAC · Plumbing · Electrical</p>
        </div>
        <button onClick={() => void runScan()} disabled={scanning} className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition-colors">
          {scanning ? "Scanning…" : "Run Scan"}
        </button>
      </div>

      {scanResult && <div className="bg-emerald-900/30 border border-emerald-800 rounded-xl px-4 py-3 text-sm text-emerald-300">{scanResult}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Revenue", value: `$${revenue}`, color: "text-emerald-400" },
          { label: "Claimed", value: byStatus.claimed, color: "text-emerald-400" },
          { label: "Available", value: byStatus.available + byStatus.qualified, color: "text-blue-400" },
          { label: "Buyers", value: buyers.filter(b => b.active).length, color: "text-[#f5f5f5]" },
        ].map(k => (
          <div key={k.label} className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
            <div className="text-xs text-[#a3a3a3] mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4">Pipeline</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
          {Object.entries(byStatus).map(([s, n]) => (
            <div key={s}><div className="text-xl font-bold">{n}</div><div className="text-[10px] text-[#525252] capitalize">{s}</div></div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Link href="/leads?status=qualified" className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 hover:border-emerald-800 transition-colors block">
          <div className="text-2xl font-bold text-blue-400">{byStatus.qualified}</div>
          <div className="text-sm font-semibold mt-1">Qualified Leads</div>
          <p className="text-xs text-[#525252] mt-1">Ready for review. Mark as Available to notify buyers.</p>
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
