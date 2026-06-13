"use client"
import { useEffect, useState } from "react"
import { nanoid } from "nanoid"
import { getCampaigns, saveCampaign, deleteCampaign, getICPs, getProducts } from "@/lib/storage"
import { TagInput } from "@/components/TagInput"
import type { Campaign, ICP, Product, Platform } from "@/types/navigator"

const PLATFORMS: Platform[] = ["linkedin", "reddit", "google", "twitter", "facebook"]
const EMPTY = (): Omit<Campaign, "id" | "createdAt" | "stats"> => ({
  name: "", icpId: "", productId: "", status: "draft",
  platforms: ["reddit", "google"], customQueries: [],
  settings: { autoApproveThreshold: 75, dailyLimit: 20, messagingStyle: "friendly" },
})

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [icps, setICPs] = useState<ICP[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selected, setSelected] = useState<Campaign | null>(null)
  const [form, setForm] = useState(EMPTY())
  const [saving, setSaving] = useState(false)

  useEffect(() => { setCampaigns(getCampaigns()); setICPs(getICPs()); setProducts(getProducts()) }, [])

  function select(c: Campaign) { setSelected(c); setForm({ name: c.name, icpId: c.icpId, productId: c.productId, status: c.status, platforms: [...c.platforms], customQueries: [...c.customQueries], settings: { ...c.settings } }) }
  function reset() { setSelected(null); setForm(EMPTY()) }
  function upd(field: keyof ReturnType<typeof EMPTY>, value: unknown) { setForm(f => ({ ...f, [field]: value })) }
  function updS(field: keyof Campaign["settings"], value: unknown) { setForm(f => ({ ...f, settings: { ...f.settings, [field]: value } })) }

  function save() {
    if (!form.name || !form.icpId || !form.productId) return alert("Name, ICP and Product required")
    setSaving(true)
    const stats = selected?.stats ?? { discovered: 0, vetted: 0, approved: 0, messaged: 0, responded: 0, converted: 0 }
    const c: Campaign = { ...form, stats, id: selected?.id ?? nanoid(10), createdAt: selected?.createdAt ?? new Date().toISOString() }
    saveCampaign(c); setCampaigns(getCampaigns()); setSelected(c); setSaving(false); alert("Saved!")
  }
  function del(id: string) { if (!confirm("Delete?")) return; deleteCampaign(id); setCampaigns(getCampaigns()); if (selected?.id === id) reset() }
  function togglePlatform(p: Platform) { const has = form.platforms.includes(p); upd("platforms", has ? form.platforms.filter(x => x !== p) : [...form.platforms, p]) }

  const inp = "w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-sm text-[#f5f5f5] placeholder-[#525252] outline-none focus:border-ocean"

  return (
    <div className="pt-20 pb-10 px-4 md:px-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold">Campaigns</h1><p className="text-sm text-[#a3a3a3] mt-0.5">Configure autopilot lead generation campaigns</p></div>
        <button onClick={reset} className="px-4 py-2 bg-ocean text-white text-sm font-semibold rounded-lg hover:bg-sky-500 transition-colors">+ New Campaign</button>
      </div>
      <div className="grid md:grid-cols-[240px_1fr] gap-6">
        <div className="space-y-2">
          {campaigns.length === 0 && <p className="text-xs text-[#525252] px-1">No campaigns yet.</p>}
          {campaigns.map(c => {
            const icp = icps.find(i => i.id === c.icpId); const product = products.find(p => p.id === c.productId)
            return (
              <div key={c.id} onClick={() => select(c)} className={`p-3 rounded-xl border cursor-pointer transition-colors ${selected?.id === c.id ? "bg-ocean/10 border-ocean" : "bg-[#111] border-[#1a1a1a] hover:border-[#2a2a2a]"}`}>
                <div className="flex justify-between gap-1"><span className="text-sm font-medium">{c.name}</span>
                  <div className="flex gap-1"><span className={`text-[9px] px-1.5 py-0.5 rounded ${c.status === "active" ? "bg-emerald-900 text-emerald-400" : "bg-[#2a2a2a] text-[#a3a3a3]"}`}>{c.status}</span><button onClick={e => { e.stopPropagation(); del(c.id) }} className="text-[#525252] hover:text-red-400 text-xs">✕</button></div>
                </div>
                <p className="text-xs text-[#525252] mt-0.5">{icp?.name ?? "—"} → {product?.name ?? "—"}</p>
                <div className="flex gap-3 mt-1 text-xs text-[#525252]"><span>{c.stats.discovered} found</span><span>{c.stats.messaged} sent</span></div>
              </div>
            )
          })}
        </div>
        <div className="space-y-4">
          <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold">Campaign Setup</h3>
            <div><label className="block text-xs text-[#a3a3a3] mb-1">Campaign Name *</label><input value={form.name} onChange={e => upd("name", e.target.value)} placeholder="e.g., Q3 SaaS Founder Outreach" className={inp} /></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="block text-xs text-[#a3a3a3] mb-1">ICP *</label>
                <select value={form.icpId} onChange={e => upd("icpId", e.target.value)} className={inp}><option value="">Select ICP…</option>{icps.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
              </div>
              <div><label className="block text-xs text-[#a3a3a3] mb-1">Product *</label>
                <select value={form.productId} onChange={e => upd("productId", e.target.value)} className={inp}><option value="">Select Product…</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              </div>
            </div>
            <div><label className="block text-xs text-[#a3a3a3] mb-2">Platforms</label>
              <div className="flex flex-wrap gap-2">{PLATFORMS.map(p => <button key={p} type="button" onClick={() => togglePlatform(p)} className={`px-3 py-1 text-xs rounded-lg border transition-colors ${form.platforms.includes(p) ? "bg-ocean/20 border-ocean text-ocean" : "bg-[#1a1a1a] border-[#2a2a2a] text-[#a3a3a3] hover:border-[#3a3a3a]"}`}>{p}</button>)}</div>
            </div>
            <div><label className="block text-xs text-[#a3a3a3] mb-1">Custom Queries</label><TagInput value={form.customQueries} onChange={v => upd("customQueries", v)} placeholder="Press Enter to add…" /></div>
          </div>
          <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold">Autopilot Settings</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="block text-xs text-[#a3a3a3] mb-1">Messaging Style</label>
                <select value={form.settings.messagingStyle} onChange={e => updS("messagingStyle", e.target.value)} className={inp}>
                  {(["formal", "casual", "technical", "friendly"] as const).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div><label className="block text-xs text-[#a3a3a3] mb-1">Daily Lead Limit</label><input type="number" min={1} max={100} value={form.settings.dailyLimit} onChange={e => updS("dailyLimit", parseInt(e.target.value))} className={inp} /></div>
            </div>
            <div>
              <label className="block text-xs text-[#a3a3a3] mb-1">Auto-Approve Threshold: <span className="text-ocean">{form.settings.autoApproveThreshold}%</span></label>
              <p className="text-[10px] text-[#525252] mb-2">Leads scoring above this % are automatically approved and messaged</p>
              <input type="range" min={50} max={99} value={form.settings.autoApproveThreshold} onChange={e => updS("autoApproveThreshold", parseInt(e.target.value))} className="w-full accent-ocean" />
              <div className="flex justify-between text-[10px] text-[#525252] mt-0.5"><span>50% (more leads)</span><span>99% (higher quality)</span></div>
            </div>
            <div><label className="block text-xs text-[#a3a3a3] mb-2">Status</label>
              <div className="flex gap-2">{(["draft", "active", "paused"] as const).map(s => <button key={s} type="button" onClick={() => upd("status", s)} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${form.status === s ? "bg-ocean/20 border-ocean text-ocean" : "bg-[#1a1a1a] border-[#2a2a2a] text-[#a3a3a3] hover:border-[#3a3a3a]"}`}>{s}</button>)}</div>
            </div>
          </div>
          {selected && (
            <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-3">Stats</h3>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {Object.entries(selected.stats).map(([k, v]) => <div key={k} className="text-center"><div className="text-xl font-bold">{v}</div><div className="text-[10px] text-[#525252] capitalize">{k}</div></div>)}
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={save} disabled={saving} className="px-6 py-2.5 bg-ocean text-white text-sm font-semibold rounded-lg disabled:opacity-50 hover:bg-sky-500 transition-colors">{saving ? "Saving…" : selected ? "Update" : "Create Campaign"}</button>
            {selected && <button onClick={reset} className="px-4 py-2.5 border border-[#2a2a2a] text-[#a3a3a3] text-sm rounded-lg hover:border-[#3a3a3a] transition-colors">+ New</button>}
          </div>
        </div>
      </div>
    </div>
  )
}
