"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { getCampaigns, getICPs, getProducts, getLeads } from "@/lib/storage"
import type { Campaign, ICP, Product, Lead } from "@/types/navigator"

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [icps, setICPs] = useState<ICP[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [running, setRunning] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setCampaigns(getCampaigns())
    setICPs(getICPs())
    setProducts(getProducts())
    setLeads(getLeads())
  }, [])

  const stats = {
    new: leads.filter(l => l.status === "new").length,
    vetted: leads.filter(l => l.status === "vetted").length,
    approved: leads.filter(l => l.status === "approved").length,
    messaged: leads.filter(l => l.status === "messaged").length,
    responded: leads.filter(l => l.status === "responded").length,
    converted: leads.filter(l => l.status === "converted").length,
    rejected: leads.filter(l => l.status === "rejected").length,
  }

  async function autopilot(campaign: Campaign) {
    const icp = icps.find(i => i.id === campaign.icpId)
    const product = products.find(p => p.id === campaign.productId)
    if (!icp || !product) return alert("Campaign ICP or product not found")
    setRunning(r => ({ ...r, [campaign.id]: true }))
    try {
      const scanRes = await fetch("/api/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaign, icp }) })
      const { leads: newLeads } = await scanRes.json() as { leads: Lead[] }
      const { saveLeads, updateCampaignStats } = await import("@/lib/storage")
      saveLeads(newLeads)
      const pipeRes = await fetch("/api/pipeline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "autopilot", leads: newLeads, icp, product, campaign }) })
      const { leads: processed } = await pipeRes.json() as { leads: Lead[] }
      saveLeads(processed)
      updateCampaignStats(campaign.id, { discovered: newLeads.length, vetted: processed.filter(l => l.status !== "rejected" && l.status !== "new").length, messaged: processed.filter(l => l.status === "messaged").length })
      const updated = getLeads()
      setLeads(updated)
      setCampaigns(getCampaigns())
      alert(`Done! Discovered ${newLeads.length} leads, messaged ${processed.filter(l => l.status === "messaged").length}.`)
    } catch (e) { alert(String(e)) }
    finally { setRunning(r => ({ ...r, [campaign.id]: false })) }
  }

  const total = leads.length
  const ready = icps.length > 0 && products.length > 0 && campaigns.length > 0

  return (
    <div className="pt-20 pb-10 px-4 md:px-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ideal Customer Navigator</h1>
          <p className="text-sm text-[#a3a3a3] mt-0.5">Autopilot lead discovery, vetting &amp; personalized outreach</p>
        </div>
        <Link href="/campaigns" className="px-4 py-2 bg-ocean text-white text-sm font-semibold rounded-lg hover:bg-sky-500 transition-colors">+ Campaign</Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "ICPs", value: icps.length, href: "/icp", icon: "◎" },
          { label: "Products", value: products.length, href: "/products", icon: "◈" },
          { label: "Campaigns", value: campaigns.filter(c => c.status === "active").length, href: "/campaigns", icon: "▶", sub: `${campaigns.length} total` },
          { label: "Total Leads", value: total, href: "/leads", icon: "◉", sub: `${stats.messaged} messaged` },
        ].map(k => (
          <Link key={k.label} href={k.href} className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4 hover:border-[#2a2a2a] transition-colors">
            <span className="text-ocean">{k.icon}</span>
            <div className="text-2xl font-bold mt-2">{k.value}</div>
            <div className="text-xs text-[#a3a3a3]">{k.label}</div>
            {k.sub && <div className="text-xs text-[#525252]">{k.sub}</div>}
          </Link>
        ))}
      </div>

      {/* Pipeline */}
      {total > 0 && (
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4">Lead Pipeline</h2>
          <div className="flex gap-3 items-end overflow-x-auto pb-1">
            {[
              { label: "Found", count: total, color: "bg-[#2a2a2a]" },
              { label: "Vetted", count: stats.vetted + stats.approved + stats.messaged + stats.responded + stats.converted, color: "bg-blue-900" },
              { label: "Approved", count: stats.approved + stats.messaged + stats.responded + stats.converted, color: "bg-ocean" },
              { label: "Messaged", count: stats.messaged + stats.responded + stats.converted, color: "bg-sky-400" },
              { label: "Responded", count: stats.responded + stats.converted, color: "bg-emerald-600" },
              { label: "Converted", count: stats.converted, color: "bg-emerald-400" },
            ].map(s => {
              const pct = total > 0 ? Math.max(6, Math.round((s.count / total) * 120)) : 6
              return (
                <div key={s.label} className="flex flex-col items-center gap-1 flex-1 min-w-[52px]">
                  <span className="text-xs font-bold">{s.count}</span>
                  <div className={`w-full rounded-lg ${s.color}`} style={{ height: pct }} />
                  <span className="text-[9px] text-[#525252] text-center">{s.label}</span>
                </div>
              )
            })}
          </div>
          <div className="flex gap-4 mt-3 pt-3 border-t border-[#1a1a1a] text-xs">
            <span className="text-[#a3a3a3]">Response rate <span className="text-emerald-400 font-semibold">{stats.messaged > 0 ? Math.round((stats.responded / stats.messaged) * 100) : 0}%</span></span>
            <span className="text-[#a3a3a3]">Converted <span className="text-emerald-400 font-semibold">{stats.converted}</span></span>
            <span className="text-[#a3a3a3]">Rejected <span className="text-red-400 font-semibold">{stats.rejected}</span></span>
          </div>
        </div>
      )}

      {/* Setup checklist */}
      {!ready && (
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4">Get Started</h2>
          <div className="space-y-3">
            {[
              { done: icps.length > 0, label: "Define your Ideal Customer Profile", href: "/icp", cta: "Create ICP" },
              { done: products.length > 0, label: "Add your product or service", href: "/products", cta: "Add Product" },
              { done: campaigns.length > 0, label: "Create a campaign", href: "/campaigns", cta: "Create Campaign" },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${s.done ? "bg-emerald-500 text-white" : "bg-[#2a2a2a] text-[#525252]"}`}>{s.done ? "✓" : "○"}</span>
                  <span className={`text-sm ${s.done ? "line-through text-[#525252]" : ""}`}>{s.label}</span>
                </div>
                {!s.done && <Link href={s.href} className="text-xs text-ocean hover:underline">{s.cta} →</Link>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaigns */}
      {campaigns.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Campaigns</h2>
          {campaigns.map(c => {
            const icp = icps.find(i => i.id === c.icpId)
            const product = products.find(p => p.id === c.productId)
            const isRunning = running[c.id]
            return (
              <div key={c.id} className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{c.name}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${c.status === "active" ? "bg-emerald-900 text-emerald-400" : "bg-[#2a2a2a] text-[#a3a3a3]"}`}>{c.status}</span>
                  </div>
                  <p className="text-xs text-[#a3a3a3] mt-0.5">{icp?.name ?? "No ICP"} → {product?.name ?? "No product"}</p>
                  <div className="flex gap-4 mt-2 text-xs">
                    <span>{c.stats.discovered} <span className="text-[#525252]">found</span></span>
                    <span>{c.stats.messaged} <span className="text-[#525252]">messaged</span></span>
                    <span>{c.stats.responded} <span className="text-[#525252]">responded</span></span>
                  </div>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {c.platforms.map(p => <span key={p} className="px-1.5 py-0.5 text-[9px] bg-[#1a1a1a] text-[#a3a3a3] rounded">{p}</span>)}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={() => void autopilot(c)} disabled={isRunning || c.status !== "active"}
                    className="px-3 py-1.5 text-xs font-semibold bg-ocean text-white rounded-lg disabled:opacity-40 hover:bg-sky-500 transition-colors">
                    {isRunning ? "Running…" : "▶ Autopilot"}
                  </button>
                  <Link href={`/leads?c=${c.id}`} className="px-3 py-1.5 text-xs text-center border border-[#2a2a2a] text-[#a3a3a3] rounded-lg hover:border-[#3a3a3a] transition-colors">
                    {leads.filter(l => l.campaignId === c.id).length} Leads
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
