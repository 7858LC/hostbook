"use client"
import { useEffect, useState, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { getLeads, saveLeads, updateLeadStatus, getCampaigns, getICPs, getProducts } from "@/lib/storage"
import type { Lead, LeadStatus, Campaign, ICP, Product } from "@/types/navigator"

const COLS: { status: LeadStatus; label: string; color: string }[] = [
  { status: "new", label: "New", color: "text-[#a3a3a3]" },
  { status: "vetted", label: "Vetted", color: "text-blue-400" },
  { status: "approved", label: "Approved", color: "text-ocean" },
  { status: "messaged", label: "Messaged", color: "text-sky-300" },
  { status: "responded", label: "Responded", color: "text-emerald-400" },
  { status: "converted", label: "Converted", color: "text-emerald-300" },
  { status: "rejected", label: "Rejected", color: "text-red-400" },
]

function intentBadge(v?: string) {
  if (!v) return null
  const cls = v === "high" ? "bg-emerald-900 text-emerald-300" : v === "medium" ? "bg-yellow-900 text-yellow-300" : "bg-[#2a2a2a] text-[#a3a3a3]"
  return <span className={`px-1 py-0.5 text-[9px] rounded font-medium ${cls}`}>{v}</span>
}

function LeadCard({ lead, onStatus, onMessage }: { lead: Lead; onStatus: (id: string, s: LeadStatus) => void; onMessage: (l: Lead) => void }) {
  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-3 space-y-2">
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="px-1 py-0.5 text-[9px] bg-[#1a1a1a] text-[#525252] rounded">{lead.platform.slice(0, 2)}</span>
            {lead.name && <span className="text-xs font-medium truncate">{lead.name}</span>}
            {intentBadge(lead.buyingIntent)}
          </div>
          {(lead.title || lead.company) && <p className="text-[10px] text-[#525252] truncate">{[lead.title, lead.company].filter(Boolean).join(" @ ")}</p>}
        </div>
        {lead.icpScore !== undefined && <span className={`text-sm font-bold shrink-0 ${lead.icpScore >= 80 ? "text-emerald-400" : lead.icpScore >= 60 ? "text-yellow-400" : "text-[#525252]"}`}>{lead.icpScore}</span>}
      </div>
      <p className="text-[10px] text-[#a3a3a3] line-clamp-2">{lead.signalText}</p>
      {lead.matchReasons && lead.matchReasons.length > 0 && (
        <div className="flex flex-wrap gap-1">{lead.matchReasons.slice(0, 2).map(r => <span key={r} className="px-1 py-0.5 text-[9px] bg-ocean/10 text-ocean rounded">{r}</span>)}</div>
      )}
      {lead.generatedMessage && <button onClick={() => onMessage(lead)} className="w-full text-[10px] text-ocean text-left truncate border-t border-[#1a1a1a] pt-1.5">✉ {lead.generatedMessage.slice(0, 70)}…</button>}
      <div className="flex gap-1 flex-wrap pt-0.5">
        {(lead.status === "new" || lead.status === "vetted") && <button onClick={() => onStatus(lead.id, "approved")} className="px-2 py-0.5 text-[10px] bg-ocean/20 text-ocean rounded hover:bg-ocean/30">Approve</button>}
        {lead.status === "responded" && <button onClick={() => onStatus(lead.id, "converted")} className="px-2 py-0.5 text-[10px] bg-emerald-900 text-emerald-400 rounded hover:bg-emerald-800">Converted</button>}
        {lead.status !== "rejected" && lead.status !== "converted" && <button onClick={() => onStatus(lead.id, "rejected")} className="px-2 py-0.5 text-[10px] bg-[#1a1a1a] text-[#525252] rounded hover:text-red-400">Reject</button>}
        <a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 text-[10px] bg-[#1a1a1a] text-[#525252] rounded hover:text-[#a3a3a3]">↗</a>
      </div>
    </div>
  )
}

function LeadsContent() {
  const sp = useSearchParams()
  const cFilter = sp.get("c") ?? ""
  const [leads, setLeads] = useState<Lead[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [icps, setICPs] = useState<ICP[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [camId, setCamId] = useState(cFilter)
  const [running, setRunning] = useState(false)
  const [msgLead, setMsgLead] = useState<Lead | null>(null)
  const [emailTo, setEmailTo] = useState("")
  const [sendingEmail, setSendingEmail] = useState(false)

  const reload = useCallback(async () => { setLeads(await getLeads(camId || undefined)) }, [camId])
  useEffect(() => {
    void reload()
    void getCampaigns().then(setCampaigns)
    void getICPs().then(setICPs)
    void getProducts().then(setProducts)
  }, [reload])

  async function updStatus(id: string, s: LeadStatus) { await updateLeadStatus(id, s); await reload() }

  async function runPipeline(action: "analyze" | "generate_messages" | "autopilot") {
    const campaign = campaigns.find(c => c.id === camId)
    const icp = icps.find(i => i.id === campaign?.icpId)
    const product = products.find(p => p.id === campaign?.productId)
    if (!campaign || !icp || !product) return alert("Select a campaign with a valid ICP and product")
    const toProcess = leads.filter(l => action === "analyze" ? l.status === "new" : action === "generate_messages" ? l.status === "approved" : l.status === "new")
    if (toProcess.length === 0) return alert("No leads to process")
    setRunning(true)
    try {
      const res = await fetch("/api/pipeline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, leads: toProcess, icp, product, campaign }) })
      const { leads: updated } = await res.json() as { leads: Lead[] }
      await saveLeads(updated); await reload()
      alert(`Done! Processed ${updated.length} leads.`)
    } catch (e) { alert(String(e)) }
    finally { setRunning(false) }
  }

  async function runScan() {
    const campaign = campaigns.find(c => c.id === camId)
    const icp = icps.find(i => i.id === campaign?.icpId)
    if (!campaign || !icp) return alert("Select a campaign first")
    setRunning(true)
    try {
      const res = await fetch("/api/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaign, icp }) })
      const { leads: newLeads } = await res.json() as { leads: Lead[] }
      await saveLeads(newLeads); await reload()
      alert(`Discovered ${newLeads.length} new leads!`)
    } catch (e) { alert(String(e)) }
    finally { setRunning(false) }
  }

  async function sendEmail() {
    if (!msgLead || !emailTo) return
    setSendingEmail(true)
    try {
      const res = await fetch("/api/send-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailTo,
          subject: `Reaching out${msgLead.name ? ` — ${msgLead.name}` : ""}`,
          message: msgLead.generatedMessage ?? "",
        }),
      })
      const json = await res.json() as { sent?: boolean; error?: string }
      if (!res.ok || !json.sent) throw new Error(json.error ?? "Send failed")
      await updateLeadStatus(msgLead.id, "messaged", { email: emailTo, sentChannel: "email", sentAt: new Date().toISOString() })
      await reload()
      setMsgLead(null); setEmailTo("")
      alert("Sent! Lead marked as Messaged.")
    } catch (e) { alert(String(e)) }
    finally { setSendingEmail(false) }
  }

  const byStatus = Object.fromEntries(COLS.map(c => [c.status, leads.filter(l => l.status === c.status)])) as Record<LeadStatus, Lead[]>

  return (
    <div className="pt-20 pb-10 px-4 md:px-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div><h1 className="text-2xl font-bold">Lead Pipeline</h1><p className="text-sm text-[#a3a3a3] mt-0.5">{leads.length} total leads</p></div>
        <div className="flex gap-2 flex-wrap">
          <select value={camId} onChange={e => setCamId(e.target.value)} className="px-3 py-1.5 bg-[#111] border border-[#1a1a1a] rounded-lg text-xs text-[#f5f5f5] outline-none">
            <option value="">All campaigns</option>{campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={() => void runScan()} disabled={running || !camId} className="px-3 py-1.5 text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-[#a3a3a3] rounded-lg disabled:opacity-40 hover:border-[#3a3a3a]">{running ? "…" : "⊕ Scan"}</button>
          <button onClick={() => void runPipeline("analyze")} disabled={running || !camId} className="px-3 py-1.5 text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-[#a3a3a3] rounded-lg disabled:opacity-40 hover:border-[#3a3a3a]">{running ? "…" : "◎ Analyze"}</button>
          <button onClick={() => void runPipeline("generate_messages")} disabled={running || !camId} className="px-3 py-1.5 text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-[#a3a3a3] rounded-lg disabled:opacity-40 hover:border-[#3a3a3a]">{running ? "…" : "✉ Generate"}</button>
          <button onClick={() => void runPipeline("autopilot")} disabled={running || !camId} className="px-3 py-1.5 text-xs bg-ocean text-white rounded-lg disabled:opacity-40 hover:bg-sky-500 font-semibold">{running ? "Running…" : "▶ Autopilot"}</button>
        </div>
      </div>
      {leads.length === 0 ? (
        <div className="text-center py-20 text-[#525252]"><p className="text-4xl mb-3">◎</p><p className="text-sm">Select a campaign and tap Scan to find leads</p></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 overflow-x-auto">
          {COLS.map(col => (
            <div key={col.status} className="min-w-[150px]">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold ${col.color}`}>{col.label}</span>
                <span className="text-xs text-[#525252] bg-[#1a1a1a] px-1.5 rounded">{byStatus[col.status]?.length ?? 0}</span>
              </div>
              <div className="space-y-2">
                {(byStatus[col.status] ?? []).slice(0, 12).map(l => <LeadCard key={l.id} lead={l} onStatus={(id, s) => void updStatus(id, s)} onMessage={setMsgLead} />)}
              </div>
            </div>
          ))}
        </div>
      )}
      {msgLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => { setMsgLead(null); setEmailTo("") }}>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-4">
              <div><h3 className="font-semibold">Generated Message</h3>{msgLead.name && <p className="text-xs text-[#a3a3a3]">To: {msgLead.name}{msgLead.company ? ` @ ${msgLead.company}` : ""}</p>}</div>
              <button onClick={() => { setMsgLead(null); setEmailTo("") }} className="text-[#525252] hover:text-[#f5f5f5] text-xl">×</button>
            </div>
            <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4 text-sm whitespace-pre-wrap mb-4 max-h-48 overflow-y-auto">{msgLead.generatedMessage}</div>
            {msgLead.messagePersonalizationNotes && <p className="text-xs text-[#525252] mb-4"><span className="text-[#a3a3a3]">Notes: </span>{msgLead.messagePersonalizationNotes}</p>}
            <div className="border-t border-[#1a1a1a] pt-4 space-y-2">
              <p className="text-xs text-[#a3a3a3] font-medium">Send via Email</p>
              <input
                type="email"
                value={emailTo}
                onChange={e => setEmailTo(e.target.value)}
                placeholder="recipient@email.com"
                className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-xs text-[#f5f5f5] placeholder-[#525252] outline-none focus:border-ocean"
              />
              <div className="flex gap-2">
                <button onClick={() => { void navigator.clipboard.writeText(msgLead.generatedMessage ?? ""); alert("Copied!") }} className="flex-1 py-2 text-sm bg-[#1a1a1a] border border-[#2a2a2a] text-[#a3a3a3] rounded-lg hover:border-[#3a3a3a] font-semibold">Copy</button>
                <button onClick={() => void sendEmail()} disabled={!emailTo || sendingEmail} className="flex-1 py-2 text-sm bg-ocean text-white rounded-lg hover:bg-sky-500 font-semibold disabled:opacity-40">{sendingEmail ? "Sending…" : "Send Email"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LeadsPage() {
  return <Suspense fallback={<div className="pt-20 px-4"><div className="animate-pulse h-40 bg-[#1a1a1a] rounded-xl" /></div>}><LeadsContent /></Suspense>
}
