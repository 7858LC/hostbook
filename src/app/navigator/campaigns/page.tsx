"use client"
import { useEffect, useState } from "react"
import type { Campaign, ICP, Product, Platform } from "@/types/navigator"

const PLATFORMS: Platform[] = ["linkedin", "reddit", "google", "twitter", "facebook"]

const EMPTY: Omit<Campaign, "id" | "createdAt" | "stats"> = {
  name: "",
  icpId: "",
  productId: "",
  status: "draft",
  platforms: ["reddit", "google"],
  customQueries: [],
  settings: {
    autoApproveThreshold: 75,
    dailyLimit: 20,
    messagingStyle: "friendly",
    includeIntroduction: true,
    includeCTA: true,
  },
}

function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState("")
  function add() {
    const t = input.trim()
    if (t && !value.includes(t)) onChange([...value, t])
    setInput("")
  }
  return (
    <div className="flex flex-wrap gap-1.5 p-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg min-h-[40px]">
      {value.map(tag => (
        <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-[#1a1a1a] text-[#f5f5f5] text-xs rounded-md">
          {tag}
          <button onClick={() => onChange(value.filter(t => t !== tag))} className="text-[#525252] hover:text-red-400">×</button>
        </span>
      ))}
      <input value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add() } }}
        onBlur={add}
        placeholder={value.length === 0 ? placeholder : "Add more…"}
        className="flex-1 min-w-[120px] bg-transparent text-xs text-[#f5f5f5] placeholder-[#525252] outline-none" />
    </div>
  )
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [icps, setICPs] = useState<ICP[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selected, setSelected] = useState<Campaign | null>(null)
  const [form, setForm] = useState<Omit<Campaign, "id" | "createdAt" | "stats">>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void Promise.all([
      fetch("/api/navigator/campaigns").then(r => r.json()).then((d: { campaigns: Campaign[] }) => setCampaigns(d.campaigns ?? [])),
      fetch("/api/navigator/icp").then(r => r.json()).then((d: { icps: ICP[] }) => setICPs(d.icps ?? [])),
      fetch("/api/navigator/products").then(r => r.json()).then((d: { products: Product[] }) => setProducts(d.products ?? [])),
    ]).finally(() => setLoading(false))
  }, [])

  function selectCampaign(c: Campaign) {
    setSelected(c)
    setForm({ name: c.name, icpId: c.icpId, productId: c.productId, status: c.status, platforms: [...c.platforms], customQueries: [...c.customQueries], settings: { ...c.settings } })
  }

  function newCampaign() { setSelected(null); setForm(EMPTY) }

  function upd(field: keyof typeof form, value: unknown) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function updSettings(field: keyof Campaign["settings"], value: unknown) {
    setForm(f => ({ ...f, settings: { ...f.settings, [field]: value } }))
  }

  async function save() {
    if (!form.name || !form.icpId || !form.productId) return alert("Name, ICP, and Product are required")
    setSaving(true)
    try {
      const payload = selected
        ? { ...form, id: selected.id, createdAt: selected.createdAt, stats: selected.stats }
        : { ...form, stats: { discovered: 0, analyzed: 0, vetted: 0, approved: 0, messaged: 0, responded: 0, converted: 0 } }
      const res = await fetch("/api/navigator/campaigns", {
        method: selected ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json() as { campaign: Campaign }
      if (selected) {
        setCampaigns(campaigns.map(c => c.id === data.campaign.id ? data.campaign : c))
      } else {
        setCampaigns([...campaigns, data.campaign])
      }
      setSelected(data.campaign)
      alert("Saved!")
    } finally {
      setSaving(false)
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this campaign?")) return
    await fetch("/api/navigator/campaigns", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    setCampaigns(campaigns.filter(c => c.id !== id))
    if (selected?.id === id) { setSelected(null); setForm(EMPTY) }
  }

  async function toggleStatus(campaign: Campaign) {
    const newStatus = campaign.status === "active" ? "paused" : "active"
    const updated = { ...campaign, status: newStatus as Campaign["status"] }
    const res = await fetch("/api/navigator/campaigns", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) })
    const data = await res.json() as { campaign: Campaign }
    setCampaigns(campaigns.map(c => c.id === data.campaign.id ? data.campaign : c))
    if (selected?.id === campaign.id) setSelected(data.campaign)
  }

  if (loading) return <div className="pt-20 pb-24 md:pb-8 px-4 md:px-8 max-w-6xl mx-auto"><div className="animate-pulse h-40 bg-[#1a1a1a] rounded-xl" /></div>

  return (
    <div className="pt-20 pb-24 md:pb-8 px-4 md:px-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5]">Campaigns</h1>
          <p className="text-sm text-[#a3a3a3] mt-0.5">Configure autopilot lead generation campaigns</p>
        </div>
        <button onClick={newCampaign} className="px-4 py-2 bg-ocean text-white text-sm font-semibold rounded-lg hover:bg-sky-500 transition-colors">+ New Campaign</button>
      </div>

      <div className="grid md:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar */}
        <div className="space-y-2">
          {campaigns.length === 0 && <p className="text-xs text-[#525252] px-2">No campaigns yet.</p>}
          {campaigns.map(c => {
            const icp = icps.find(i => i.id === c.icpId)
            const product = products.find(p => p.id === c.productId)
            return (
              <div key={c.id} onClick={() => selectCampaign(c)}
                className={`p-3 rounded-xl border cursor-pointer transition-colors ${selected?.id === c.id ? "bg-ocean/10 border-ocean" : "bg-[#111111] border-[#1a1a1a] hover:border-[#2a2a2a]"}`}>
                <div className="flex items-start justify-between gap-1">
                  <span className="text-sm font-medium text-[#f5f5f5] leading-snug">{c.name}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={e => { e.stopPropagation(); void toggleStatus(c) }}
                      className={`text-[10px] px-1.5 py-0.5 rounded ${c.status === "active" ? "bg-emerald-900 text-emerald-400" : "bg-[#2a2a2a] text-[#a3a3a3]"}`}>
                      {c.status === "active" ? "●" : "○"}
                    </button>
                    <button onClick={e => { e.stopPropagation(); void del(c.id) }} className="text-[#525252] hover:text-red-400 text-xs">✕</button>
                  </div>
                </div>
                <p className="text-xs text-[#525252] mt-0.5">{icp?.name ?? "—"} → {product?.name ?? "—"}</p>
                <div className="flex gap-2 mt-1.5 text-xs text-[#525252]">
                  <span>{c.stats.discovered} found</span>
                  <span>{c.stats.messaged} sent</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Form */}
        <div className="space-y-5">
          <div className="bg-[#111111] border border-[#1a1a1a] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#f5f5f5]">Campaign Setup</h3>

            <div>
              <label className="block text-xs text-[#a3a3a3] mb-1">Campaign Name *</label>
              <input value={form.name} onChange={e => upd("name", e.target.value)} placeholder="e.g., Q3 SaaS Founder Outreach"
                className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-sm text-[#f5f5f5] placeholder-[#525252] outline-none focus:border-ocean" />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#a3a3a3] mb-1">Ideal Customer Profile *</label>
                <select value={form.icpId} onChange={e => upd("icpId", e.target.value)}
                  className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-sm text-[#f5f5f5] outline-none focus:border-ocean">
                  <option value="">Select ICP…</option>
                  {icps.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#a3a3a3] mb-1">Product / Service *</label>
                <select value={form.productId} onChange={e => upd("productId", e.target.value)}
                  className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-sm text-[#f5f5f5] outline-none focus:border-ocean">
                  <option value="">Select Product…</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#a3a3a3] mb-2">Platforms to Scan</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => (
                  <button key={p} type="button"
                    onClick={() => {
                      const has = form.platforms.includes(p)
                      upd("platforms", has ? form.platforms.filter(x => x !== p) : [...form.platforms, p])
                    }}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${form.platforms.includes(p) ? "bg-ocean/20 border-ocean text-ocean" : "bg-[#1a1a1a] border-[#2a2a2a] text-[#a3a3a3] hover:border-[#3a3a3a]"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#a3a3a3] mb-1">Additional Custom Queries</label>
              <p className="text-[10px] text-[#525252] mb-1">Queries beyond what&apos;s auto-generated from the ICP</p>
              <TagInput value={form.customQueries} onChange={v => upd("customQueries", v)} placeholder="Press Enter to add…" />
            </div>
          </div>

          <div className="bg-[#111111] border border-[#1a1a1a] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#f5f5f5]">Autopilot Settings</h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#a3a3a3] mb-1">Messaging Style</label>
                <select value={form.settings.messagingStyle} onChange={e => updSettings("messagingStyle", e.target.value)}
                  className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-sm text-[#f5f5f5] outline-none focus:border-ocean">
                  {(["formal", "casual", "technical", "friendly"] as const).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#a3a3a3] mb-1">Daily Lead Limit</label>
                <input type="number" min={1} max={100} value={form.settings.dailyLimit} onChange={e => updSettings("dailyLimit", parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-sm text-[#f5f5f5] outline-none focus:border-ocean" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#a3a3a3] mb-1">
                Auto-Approve Threshold: <span className="text-ocean">{form.settings.autoApproveThreshold ?? 75}%</span>
              </label>
              <p className="text-[10px] text-[#525252] mb-2">Leads scoring above this ICP match % will be auto-approved and messaged</p>
              <input type="range" min={50} max={99} value={form.settings.autoApproveThreshold ?? 75}
                onChange={e => updSettings("autoApproveThreshold", parseInt(e.target.value))}
                className="w-full accent-ocean" />
              <div className="flex justify-between text-[10px] text-[#525252] mt-0.5">
                <span>50% (more leads)</span>
                <span>99% (higher quality)</span>
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.settings.includeIntroduction} onChange={e => updSettings("includeIntroduction", e.target.checked)} className="accent-ocean" />
                <span className="text-xs text-[#a3a3a3]">Include introduction</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.settings.includeCTA} onChange={e => updSettings("includeCTA", e.target.checked)} className="accent-ocean" />
                <span className="text-xs text-[#a3a3a3]">Include call-to-action</span>
              </label>
            </div>

            <div>
              <label className="block text-xs text-[#a3a3a3] mb-1">Status</label>
              <div className="flex gap-2">
                {(["draft", "active", "paused"] as const).map(s => (
                  <button key={s} type="button" onClick={() => upd("status", s)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${form.status === s ? "bg-ocean/20 border-ocean text-ocean" : "bg-[#1a1a1a] border-[#2a2a2a] text-[#a3a3a3] hover:border-[#3a3a3a]"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selected && (
            <div className="bg-[#111111] border border-[#1a1a1a] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[#f5f5f5] mb-3">Campaign Stats</h3>
              <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
                {Object.entries(selected.stats).map(([k, v]) => (
                  <div key={k} className="text-center">
                    <div className="text-xl font-bold text-[#f5f5f5]">{v}</div>
                    <div className="text-[10px] text-[#525252] capitalize">{k}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => void save()} disabled={saving}
              className="px-6 py-2.5 bg-ocean text-white text-sm font-semibold rounded-lg disabled:opacity-50 hover:bg-sky-500 transition-colors">
              {saving ? "Saving…" : selected ? "Update Campaign" : "Create Campaign"}
            </button>
            {selected && (
              <button onClick={newCampaign} className="px-4 py-2.5 border border-[#2a2a2a] text-[#a3a3a3] text-sm rounded-lg hover:border-[#3a3a3a] transition-colors">+ New</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
