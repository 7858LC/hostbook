"use client"
import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import type { Lead, LeadStatus, Campaign } from "@/types/navigator"

const STATUS_COLUMNS: { status: LeadStatus; label: string; color: string }[] = [
  { status: "new",       label: "New",       color: "text-[#a3a3a3]" },
  { status: "vetted",    label: "Vetted",     color: "text-blue-400" },
  { status: "approved",  label: "Approved",   color: "text-ocean" },
  { status: "messaged",  label: "Messaged",   color: "text-sky-300" },
  { status: "responded", label: "Responded",  color: "text-emerald-400" },
  { status: "converted", label: "Converted",  color: "text-emerald-300" },
  { status: "rejected",  label: "Rejected",   color: "text-red-400" },
]

function intentBadge(intent?: string) {
  if (!intent) return null
  const cls = intent === "high" ? "bg-emerald-900 text-emerald-300" : intent === "medium" ? "bg-yellow-900 text-yellow-300" : "bg-[#2a2a2a] text-[#a3a3a3]"
  return <span className={`px-1.5 py-0.5 text-[9px] rounded font-medium ${cls}`}>{intent}</span>
}

function platformIcon(p: string) {
  const icons: Record<string, string> = { linkedin: "in", reddit: "r/", google: "G", twitter: "𝕏", facebook: "f" }
  return icons[p] ?? p.slice(0, 2)
}

function LeadCard({ lead, onStatusChange, onViewMessage }: {
  lead: Lead
  onStatusChange: (id: string, status: LeadStatus) => void
  onViewMessage: (lead: Lead) => void
}) {
  return (
    <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-1.5 py-0.5 text-[9px] bg-[#1a1a1a] text-[#525252] rounded font-mono">{platformIcon(lead.platform)}</span>
            {lead.name && <span className="text-xs font-medium text-[#f5f5f5] truncate">{lead.name}</span>}
            {intentBadge(lead.buyingIntent)}
          </div>
          {(lead.title || lead.company) && (
            <p className="text-[10px] text-[#525252] mt-0.5 truncate">{[lead.title, lead.company].filter(Boolean).join(" @ ")}</p>
          )}
        </div>
        {lead.icpScore !== undefined && (
          <div className={`text-sm font-bold shrink-0 ${lead.icpScore >= 80 ? "text-emerald-400" : lead.icpScore >= 60 ? "text-yellow-400" : "text-[#525252]"}`}>
            {lead.icpScore}
          </div>
        )}
      </div>

      <p className="text-[10px] text-[#a3a3a3] line-clamp-2">{lead.signalText}</p>

      {lead.matchReasons && lead.matchReasons.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {lead.matchReasons.slice(0, 2).map(r => (
            <span key={r} className="px-1.5 py-0.5 text-[9px] bg-ocean/10 text-ocean rounded">{r}</span>
          ))}
        </div>
      )}

      {lead.generatedMessage && (
        <button onClick={() => onViewMessage(lead)}
          className="w-full text-[10px] text-ocean hover:text-sky-300 text-left truncate border-t border-[#1a1a1a] pt-1.5">
          ✉ {lead.generatedMessage.slice(0, 80)}…
        </button>
      )}

      <div className="flex gap-1 flex-wrap pt-0.5">
        {lead.status === "new" && (
          <button onClick={() => onStatusChange(lead.id, "approved")}
            className="px-2 py-0.5 text-[10px] bg-ocean/20 text-ocean rounded hover:bg-ocean/30 transition-colors">Approve</button>
        )}
        {lead.status === "vetted" && (
          <button onClick={() => onStatusChange(lead.id, "approved")}
            className="px-2 py-0.5 text-[10px] bg-ocean/20 text-ocean rounded hover:bg-ocean/30 transition-colors">Approve</button>
        )}
        {lead.status === "responded" && (
          <button onClick={() => onStatusChange(lead.id, "converted")}
            className="px-2 py-0.5 text-[10px] bg-emerald-900 text-emerald-400 rounded hover:bg-emerald-800 transition-colors">Mark Converted</button>
        )}
        {lead.status !== "rejected" && lead.status !== "converted" && (
          <button onClick={() => onStatusChange(lead.id, "rejected")}
            className="px-2 py-0.5 text-[10px] bg-[#1a1a1a] text-[#525252] rounded hover:text-red-400 transition-colors">Reject</button>
        )}
        <a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer"
          className="px-2 py-0.5 text-[10px] bg-[#1a1a1a] text-[#525252] rounded hover:text-[#a3a3a3] transition-colors">↗</a>
      </div>
    </div>
  )
}

function LeadsContent() {
  const searchParams = useSearchParams()
  const campaignFilter = searchParams.get("campaign")

  const [leads, setLeads] = useState<Lead[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [activeCampaign, setActiveCampaign] = useState<string>(campaignFilter ?? "")
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [viewMessage, setViewMessage] = useState<Lead | null>(null)
  const [filterStatus, setFilterStatus] = useState<LeadStatus | "all">("all")

  const loadLeads = useCallback(async () => {
    const url = activeCampaign ? `/api/navigator/leads?campaignId=${activeCampaign}` : "/api/navigator/leads"
    const data = await fetch(url).then(r => r.json()) as { leads: Lead[] }
    setLeads(data.leads ?? [])
  }, [activeCampaign])

  useEffect(() => {
    void Promise.all([
      loadLeads(),
      fetch("/api/navigator/campaigns").then(r => r.json()).then((d: { campaigns: Campaign[] }) => setCampaigns(d.campaigns ?? [])),
    ]).finally(() => setLoading(false))
  }, [loadLeads])

  async function updateStatus(id: string, status: LeadStatus) {
    await fetch("/api/navigator/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    })
    setLeads(ls => ls.map(l => l.id === id ? { ...l, status } : l))
  }

  async function runPipeline(action: "analyze" | "generate_messages" | "autopilot") {
    if (!activeCampaign) return alert("Select a campaign first")
    setRunning(true)
    try {
      const res = await fetch("/api/navigator/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: activeCampaign, action }),
      })
      const data = await res.json() as { processed: number; vetted?: number; messaged?: number }
      await loadLeads()
      alert(`Done! Processed ${data.processed} leads. ${data.vetted ? `Vetted: ${data.vetted}.` : ""} ${data.messaged ? `Messaged: ${data.messaged}.` : ""}`)
    } catch (e) {
      alert(`Error: ${String(e)}`)
    } finally {
      setRunning(false)
    }
  }

  async function runScan() {
    if (!activeCampaign) return alert("Select a campaign first")
    setRunning(true)
    try {
      const res = await fetch("/api/navigator/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: activeCampaign }),
      })
      const data = await res.json() as { discovered: number }
      await loadLeads()
      alert(`Scan complete! Discovered ${data.discovered} new leads.`)
    } catch (e) {
      alert(`Error: ${String(e)}`)
    } finally {
      setRunning(false)
    }
  }

  const filteredLeads = filterStatus === "all" ? leads : leads.filter(l => l.status === filterStatus)

  const leadsByStatus = STATUS_COLUMNS.reduce((acc, col) => {
    acc[col.status] = filteredLeads.filter(l => l.status === col.status)
    return acc
  }, {} as Record<LeadStatus, Lead[]>)

  if (loading) return <div className="pt-20 pb-24 md:pb-8 px-4 md:px-8 max-w-7xl mx-auto"><div className="animate-pulse h-40 bg-[#1a1a1a] rounded-xl" /></div>

  return (
    <div className="pt-20 pb-24 md:pb-8 px-4 md:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5]">Lead Pipeline</h1>
          <p className="text-sm text-[#a3a3a3] mt-0.5">{leads.length} total leads</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={activeCampaign} onChange={e => setActiveCampaign(e.target.value)}
            className="px-3 py-1.5 bg-[#111111] border border-[#1a1a1a] rounded-lg text-xs text-[#f5f5f5] outline-none">
            <option value="">All campaigns</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={() => void runScan()} disabled={running || !activeCampaign}
            className="px-3 py-1.5 text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-[#a3a3a3] rounded-lg disabled:opacity-50 hover:border-[#3a3a3a] transition-colors">
            {running ? "…" : "⊕ Scan"}
          </button>
          <button onClick={() => void runPipeline("analyze")} disabled={running || !activeCampaign}
            className="px-3 py-1.5 text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-[#a3a3a3] rounded-lg disabled:opacity-50 hover:border-[#3a3a3a] transition-colors">
            {running ? "…" : "◎ Analyze"}
          </button>
          <button onClick={() => void runPipeline("generate_messages")} disabled={running || !activeCampaign}
            className="px-3 py-1.5 text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-[#a3a3a3] rounded-lg disabled:opacity-50 hover:border-[#3a3a3a] transition-colors">
            {running ? "…" : "✉ Generate"}
          </button>
          <button onClick={() => void runPipeline("autopilot")} disabled={running || !activeCampaign}
            className="px-3 py-1.5 text-xs bg-ocean text-white rounded-lg disabled:opacity-50 hover:bg-sky-500 transition-colors font-semibold">
            {running ? "Running…" : "▶ Autopilot"}
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFilterStatus("all")}
          className={`px-3 py-1 text-xs rounded-full border transition-colors ${filterStatus === "all" ? "border-ocean text-ocean" : "border-[#1a1a1a] text-[#525252] hover:border-[#2a2a2a]"}`}>
          All ({leads.length})
        </button>
        {STATUS_COLUMNS.map(col => {
          const count = leads.filter(l => l.status === col.status).length
          if (count === 0 && filterStatus !== col.status) return null
          return (
            <button key={col.status} onClick={() => setFilterStatus(col.status)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${filterStatus === col.status ? "border-ocean text-ocean" : "border-[#1a1a1a] text-[#525252] hover:border-[#2a2a2a]"}`}>
              {col.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Kanban board */}
      {leads.length === 0 ? (
        <div className="text-center py-16 text-[#525252]">
          <p className="text-4xl mb-3">◎</p>
          <p className="text-sm">No leads yet. Select a campaign and run a scan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 overflow-x-auto">
          {STATUS_COLUMNS.map(col => {
            const colLeads = leadsByStatus[col.status] ?? []
            return (
              <div key={col.status} className="min-w-[160px]">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold ${col.color}`}>{col.label}</span>
                  <span className="text-xs text-[#525252] bg-[#1a1a1a] px-1.5 rounded">{colLeads.length}</span>
                </div>
                <div className="space-y-2">
                  {colLeads.slice(0, 15).map(lead => (
                    <LeadCard key={lead.id} lead={lead} onStatusChange={(id, s) => void updateStatus(id, s)} onViewMessage={setViewMessage} />
                  ))}
                  {colLeads.length > 15 && (
                    <p className="text-[10px] text-[#525252] text-center py-1">+{colLeads.length - 15} more</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Message modal */}
      {viewMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setViewMessage(null)}>
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-[#f5f5f5]">Generated Message</h3>
                {viewMessage.name && <p className="text-xs text-[#a3a3a3] mt-0.5">To: {viewMessage.name}{viewMessage.company ? ` @ ${viewMessage.company}` : ""}</p>}
              </div>
              <button onClick={() => setViewMessage(null)} className="text-[#525252] hover:text-[#f5f5f5] text-xl">×</button>
            </div>
            <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl p-4 text-sm text-[#f5f5f5] whitespace-pre-wrap mb-4">
              {viewMessage.generatedMessage}
            </div>
            {viewMessage.messagePersonalizationNotes && (
              <p className="text-xs text-[#525252] mb-4">
                <span className="text-[#a3a3a3]">Personalization: </span>{viewMessage.messagePersonalizationNotes}
              </p>
            )}
            <div className="flex gap-2">
              <button onClick={() => { void navigator.clipboard.writeText(viewMessage.generatedMessage ?? ""); alert("Copied!") }}
                className="flex-1 py-2 text-xs bg-ocean text-white rounded-lg hover:bg-sky-500 transition-colors font-semibold">
                Copy Message
              </button>
              {viewMessage.profileUrl && (
                <a href={viewMessage.profileUrl} target="_blank" rel="noopener noreferrer"
                  className="flex-1 py-2 text-xs bg-[#1a1a1a] text-[#a3a3a3] rounded-lg hover:bg-[#2a2a2a] transition-colors text-center">
                  View Profile ↗
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="pt-20 pb-24 md:pb-8 px-4 md:px-8"><div className="animate-pulse h-40 bg-[#1a1a1a] rounded-xl" /></div>}>
      <LeadsContent />
    </Suspense>
  )
}
