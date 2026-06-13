"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import type { Campaign, Lead, ICP, Product } from "@/types/navigator"

interface DashStats {
  icps: number
  products: number
  activeCampaigns: number
  leads: { new: number; analyzing: number; vetted: number; approved: number; messaged: number; responded: number; converted: number; rejected: number }
}

export default function NavigatorPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [icps, setICPs] = useState<ICP[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState<Record<string, boolean>>({})

  useEffect(() => {
    void Promise.all([
      fetch("/api/navigator/campaigns").then(r => r.json()).then(d => setCampaigns(d.campaigns ?? [])),
      fetch("/api/navigator/leads").then(r => r.json()).then(d => setLeads(d.leads ?? [])),
      fetch("/api/navigator/icp").then(r => r.json()).then(d => setICPs(d.icps ?? [])),
      fetch("/api/navigator/products").then(r => r.json()).then(d => setProducts(d.products ?? [])),
    ]).finally(() => setLoading(false))
  }, [])

  const stats: DashStats = {
    icps: icps.length,
    products: products.length,
    activeCampaigns: campaigns.filter(c => c.status === "active").length,
    leads: {
      new: leads.filter(l => l.status === "new").length,
      analyzing: leads.filter(l => l.status === "analyzing").length,
      vetted: leads.filter(l => l.status === "vetted").length,
      approved: leads.filter(l => l.status === "approved").length,
      messaged: leads.filter(l => l.status === "messaged").length,
      responded: leads.filter(l => l.status === "responded").length,
      converted: leads.filter(l => l.status === "converted").length,
      rejected: leads.filter(l => l.status === "rejected").length,
    },
  }

  async function triggerAutopilot(campaignId: string) {
    setRunning(r => ({ ...r, [campaignId]: true }))
    try {
      // Step 1: Scan
      const scanRes = await fetch("/api/navigator/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      })
      const scanData = await scanRes.json() as { discovered: number }

      // Step 2: Autopilot pipeline
      await fetch("/api/navigator/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, action: "autopilot" }),
      })

      // Refresh leads
      const freshLeads = await fetch("/api/navigator/leads").then(r => r.json()) as { leads: Lead[] }
      setLeads(freshLeads.leads ?? [])
      const freshCampaigns = await fetch("/api/navigator/campaigns").then(r => r.json()) as { campaigns: Campaign[] }
      setCampaigns(freshCampaigns.campaigns ?? [])

      alert(`Autopilot complete! Discovered ${scanData.discovered} leads.`)
    } catch (e) {
      alert(`Error: ${String(e)}`)
    } finally {
      setRunning(r => ({ ...r, [campaignId]: false }))
    }
  }

  if (loading) return (
    <div className="pt-20 pb-24 md:pb-8 px-4 md:px-8 max-w-6xl mx-auto">
      <div className="animate-pulse space-y-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-[#1a1a1a] rounded-xl" />)}
      </div>
    </div>
  )

  const totalLeads = leads.length
  const conversionRate = totalLeads > 0 ? Math.round((stats.leads.converted / totalLeads) * 100) : 0
  const responseRate = stats.leads.messaged > 0 ? Math.round((stats.leads.responded / stats.leads.messaged) * 100) : 0

  return (
    <div className="pt-20 pb-24 md:pb-8 px-4 md:px-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5]">Ideal Customer Navigator</h1>
          <p className="text-sm text-[#a3a3a3] mt-1">Autopilot lead discovery, vetting &amp; direct outreach</p>
        </div>
        <Link href="/navigator/campaigns" className="px-4 py-2 bg-ocean text-white text-sm font-semibold rounded-lg hover:bg-sky-500 transition-colors">
          + New Campaign
        </Link>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Ideal Profiles", value: stats.icps, href: "/navigator/icp", icon: "◎", note: "ICPs defined" },
          { label: "Products", value: stats.products, href: "/navigator/products", icon: "◈", note: "in catalog" },
          { label: "Active Campaigns", value: stats.activeCampaigns, href: "/navigator/campaigns", icon: "▶", note: `of ${campaigns.length} total` },
          { label: "Total Leads", value: totalLeads, href: "/navigator/leads", icon: "◉", note: `${stats.leads.messaged} messaged` },
        ].map(kpi => (
          <Link key={kpi.label} href={kpi.href}
            className="bg-[#111111] border border-[#1a1a1a] rounded-xl p-4 hover:border-[#2a2a2a] transition-colors">
            <div className="flex items-start justify-between mb-2">
              <span className="text-ocean text-xl">{kpi.icon}</span>
            </div>
            <div className="text-2xl font-bold text-[#f5f5f5]">{kpi.value}</div>
            <div className="text-xs text-[#a3a3a3] mt-0.5">{kpi.label}</div>
            <div className="text-xs text-[#525252] mt-0.5">{kpi.note}</div>
          </Link>
        ))}
      </div>

      {/* Pipeline funnel */}
      {totalLeads > 0 && (
        <div className="bg-[#111111] border border-[#1a1a1a] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-[#f5f5f5] mb-4">Lead Pipeline</h2>
          <div className="flex items-end gap-2 md:gap-4 overflow-x-auto pb-2">
            {[
              { label: "Discovered", count: totalLeads, color: "bg-[#2a2a2a]" },
              { label: "Vetted", count: stats.leads.vetted + stats.leads.approved + stats.leads.messaged + stats.leads.responded + stats.leads.converted, color: "bg-blue-900" },
              { label: "Approved", count: stats.leads.approved + stats.leads.messaged + stats.leads.responded + stats.leads.converted, color: "bg-ocean" },
              { label: "Messaged", count: stats.leads.messaged + stats.leads.responded + stats.leads.converted, color: "bg-sky-500" },
              { label: "Responded", count: stats.leads.responded + stats.leads.converted, color: "bg-emerald-700" },
              { label: "Converted", count: stats.leads.converted, color: "bg-emerald-500" },
            ].map(stage => {
              const pct = totalLeads > 0 ? Math.max(4, Math.round((stage.count / totalLeads) * 100)) : 4
              return (
                <div key={stage.label} className="flex flex-col items-center gap-1 min-w-[60px] flex-1">
                  <span className="text-xs font-bold text-[#f5f5f5]">{stage.count}</span>
                  <div className="w-full rounded-t-lg transition-all" style={{ height: `${pct * 1.2}px` }}>
                    <div className={`w-full h-full rounded-lg ${stage.color}`} />
                  </div>
                  <span className="text-[10px] text-[#a3a3a3] text-center leading-tight">{stage.label}</span>
                </div>
              )
            })}
          </div>
          <div className="flex gap-6 mt-4 pt-4 border-t border-[#1a1a1a]">
            <div>
              <span className="text-xs text-[#a3a3a3]">Response Rate </span>
              <span className="text-sm font-semibold text-emerald-400">{responseRate}%</span>
            </div>
            <div>
              <span className="text-xs text-[#a3a3a3]">Conversion Rate </span>
              <span className="text-sm font-semibold text-emerald-400">{conversionRate}%</span>
            </div>
            <div>
              <span className="text-xs text-[#a3a3a3]">Rejected </span>
              <span className="text-sm font-semibold text-red-400">{stats.leads.rejected}</span>
            </div>
          </div>
        </div>
      )}

      {/* Setup checklist if nothing configured */}
      {icps.length === 0 || products.length === 0 || campaigns.length === 0 ? (
        <div className="bg-[#111111] border border-[#1a1a1a] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-[#f5f5f5] mb-4">Get Started</h2>
          <div className="space-y-3">
            {[
              { done: icps.length > 0, label: "Define your Ideal Customer Profile", href: "/navigator/icp", action: "Create ICP" },
              { done: products.length > 0, label: "Add your product or service", href: "/navigator/products", action: "Add Product" },
              { done: campaigns.length > 0, label: "Create a campaign", href: "/navigator/campaigns", action: "Create Campaign" },
            ].map(step => (
              <div key={step.label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step.done ? "bg-emerald-500 text-white" : "bg-[#2a2a2a] text-[#525252]"}`}>
                    {step.done ? "✓" : "○"}
                  </span>
                  <span className={`text-sm ${step.done ? "line-through text-[#525252]" : "text-[#f5f5f5]"}`}>{step.label}</span>
                </div>
                {!step.done && (
                  <Link href={step.href} className="text-xs text-ocean hover:underline">{step.action} →</Link>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Active campaigns */}
      {campaigns.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[#f5f5f5]">Campaigns</h2>
          {campaigns.map(campaign => {
            const icp = icps.find(i => i.id === campaign.icpId)
            const product = products.find(p => p.id === campaign.productId)
            const campaignLeads = leads.filter(l => l.campaignId === campaign.id)
            const isRunning = running[campaign.id] ?? false
            return (
              <div key={campaign.id} className="bg-[#111111] border border-[#1a1a1a] rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-[#f5f5f5]">{campaign.name}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        campaign.status === "active" ? "bg-emerald-900 text-emerald-400" :
                        campaign.status === "paused" ? "bg-yellow-900 text-yellow-400" :
                        "bg-[#2a2a2a] text-[#a3a3a3]"
                      }`}>{campaign.status}</span>
                    </div>
                    <p className="text-xs text-[#a3a3a3] mt-1">
                      {icp?.name ?? "—"} → {product?.name ?? "—"}
                    </p>
                    <div className="flex gap-4 mt-3 flex-wrap">
                      {[
                        { label: "Discovered", val: campaign.stats.discovered },
                        { label: "Vetted", val: campaign.stats.vetted },
                        { label: "Messaged", val: campaign.stats.messaged },
                        { label: "Responded", val: campaign.stats.responded },
                      ].map(s => (
                        <div key={s.label}>
                          <span className="text-lg font-bold text-[#f5f5f5]">{s.val}</span>
                          <span className="text-xs text-[#525252] ml-1">{s.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {campaign.platforms.map(p => (
                        <span key={p} className="px-1.5 py-0.5 text-[10px] bg-[#1a1a1a] text-[#a3a3a3] rounded">{p}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => void triggerAutopilot(campaign.id)}
                      disabled={isRunning || campaign.status !== "active"}
                      className="px-3 py-1.5 text-xs font-semibold bg-ocean text-white rounded-lg disabled:opacity-50 hover:bg-sky-500 transition-colors"
                    >
                      {isRunning ? "Running…" : "▶ Autopilot"}
                    </button>
                    <Link href={`/navigator/leads?campaign=${campaign.id}`}
                      className="px-3 py-1.5 text-xs font-medium border border-[#2a2a2a] text-[#a3a3a3] rounded-lg text-center hover:border-[#3a3a3a] transition-colors">
                      {campaignLeads.length} Leads
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
