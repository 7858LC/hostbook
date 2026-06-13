"use client"
import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { getLeads, updateLeadStatus } from "@/lib/storage"
import type { TradesLead } from "@/types/leads"

const URGENCY_COLOR: Record<string, string> = {
  emergency: "text-red-400 bg-red-900/30",
  urgent: "text-yellow-400 bg-yellow-900/30",
  planned: "text-blue-400 bg-blue-900/30",
  unknown: "text-[#525252] bg-[#1a1a1a]",
}

const STATUS_TABS = ["all", "qualified", "available", "notified", "claimed", "rejected", "raw"]

function LeadsContent() {
  const sp = useSearchParams()
  const [leads, setLeads] = useState<TradesLead[]>([])
  const [tab, setTab] = useState(sp.get("status") ?? "qualified")
  const [notifying, setNotifying] = useState<string | null>(null)

  const reload = async () => { setLeads(await getLeads()) }
  useEffect(() => { void reload() }, [])

  const filtered = tab === "all" ? leads : leads.filter(l => l.status === tab)

  async function markAvailable(id: string) {
    await updateLeadStatus(id, "available")
    await reload()
  }

  async function notifyBuyers(leadId: string) {
    setNotifying(leadId)
    try {
      const res = await fetch("/api/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId }) })
      const data = await res.json() as { notified: number; matching: number }
      alert(`Notified ${data.notified} of ${data.matching} matching buyers`)
      await reload()
    } catch (e) { alert(String(e)) }
    finally { setNotifying(null) }
  }

  async function reject(id: string) {
    await updateLeadStatus(id, "rejected")
    await reload()
  }

  return (
    <div className="pt-20 pb-10 px-4 md:px-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Leads</h1>
        <span className="text-sm text-[#a3a3a3]">{filtered.length} shown</span>
      </div>
      <div className="flex gap-2 flex-wrap mb-6">
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => setTab(s)} className={`px-3 py-1 text-xs rounded-lg border transition-colors capitalize ${tab === s ? "bg-emerald-900/40 border-emerald-700 text-emerald-400" : "bg-[#111] border-[#1a1a1a] text-[#a3a3a3] hover:border-[#2a2a2a]"}`}>{s} {s !== "all" && `(${leads.filter(l => l.status === s).length})`}</button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.length === 0 && <p className="text-sm text-[#525252] text-center py-12">No leads in this status. Run a scan from the dashboard.</p>}
        {filtered.map(lead => (
          <div key={lead.id} className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-semibold text-[#f5f5f5] uppercase">{lead.tradeType}</span>
                  <span className={`px-2 py-0.5 text-[10px] rounded font-medium ${URGENCY_COLOR[lead.urgency]}`}>{lead.urgency}</span>
                  {lead.location && <span className="text-[10px] text-[#a3a3a3]">{lead.location}{lead.locationState ? `, ${lead.locationState}` : ""}</span>}
                  <span className="text-[10px] text-[#525252]">{lead.platform}</span>
                </div>
                <p className="text-sm text-[#f5f5f5] mb-1">{lead.problemSummary}</p>
                <p className="text-xs text-[#525252] line-clamp-2">{lead.rawText.slice(0, 200)}</p>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-[#525252]">
                  <span>Score: <span className={`font-bold ${lead.qualityScore >= 7 ? "text-emerald-400" : lead.qualityScore >= 5 ? "text-yellow-400" : "text-[#525252]"}`}>{lead.qualityScore}/10</span></span>
                  <span>Value: <span className="text-emerald-400 font-bold">${lead.estimatedValue}</span></span>
                  {lead.authorHandle && <span>{lead.authorHandle}</span>}
                  <a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400">source</a>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                {lead.status === "qualified" && (
                  <>
                    <button onClick={() => void markAvailable(lead.id)} className="px-3 py-1.5 text-xs bg-blue-900/20 text-blue-400 border border-blue-900/30 rounded-lg hover:bg-blue-900/30">Mark Available</button>
                    <button onClick={() => void reject(lead.id)} className="px-3 py-1.5 text-xs bg-[#1a1a1a] text-[#525252] rounded-lg hover:text-red-400">Reject</button>
                  </>
                )}
                {lead.status === "available" && (
                  <button onClick={() => void notifyBuyers(lead.id)} disabled={notifying === lead.id} className="px-3 py-1.5 text-xs bg-emerald-700 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50">
                    {notifying === lead.id ? "Notifying…" : "Notify Buyers"}
                  </button>
                )}
                {lead.status === "claimed" && <span className="px-3 py-1.5 text-xs bg-emerald-900/40 text-emerald-400 rounded-lg text-center">Claimed</span>}
                {lead.status === "notified" && <span className="px-3 py-1.5 text-xs bg-yellow-900/40 text-yellow-400 rounded-lg text-center">Awaiting claim</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LeadsPage() {
  return <Suspense fallback={<div className="pt-20 px-4"><div className="animate-pulse h-40 bg-[#1a1a1a] rounded-xl" /></div>}><LeadsContent /></Suspense>
}
