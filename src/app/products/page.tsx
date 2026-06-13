"use client"
import { useEffect, useState } from "react"
import { nanoid } from "nanoid"
import { getProducts, saveProduct, deleteProduct, getICPs } from "@/lib/storage"
import { TagInput } from "@/components/TagInput"
import type { Product, ICP } from "@/types/navigator"

const EMPTY = (): Omit<Product, "id" | "createdAt"> => ({ name: "", type: "product", description: "", valueProposition: "", keyBenefits: [], targetICPIds: [], pricing: { model: "subscription" }, uniqueSellingPoints: [], targetProblems: [] })

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [icps, setICPs] = useState<ICP[]>([])
  const [selected, setSelected] = useState<Product | null>(null)
  const [form, setForm] = useState(EMPTY())
  const [saving, setSaving] = useState(false)

  useEffect(() => { void getProducts().then(setProducts); void getICPs().then(setICPs) }, [])

  function select(p: Product) { setSelected(p); setForm({ name: p.name, type: p.type, description: p.description, valueProposition: p.valueProposition, keyBenefits: [...p.keyBenefits], targetICPIds: [...p.targetICPIds], pricing: { ...p.pricing }, uniqueSellingPoints: [...p.uniqueSellingPoints], targetProblems: [...p.targetProblems] }) }
  function reset() { setSelected(null); setForm(EMPTY()) }

  async function save() {
    if (!form.name || !form.valueProposition) return alert("Name and value proposition required")
    setSaving(true)
    const p: Product = { ...form, id: selected?.id ?? nanoid(10), createdAt: selected?.createdAt ?? new Date().toISOString() }
    await saveProduct(p); setProducts(await getProducts()); setSelected(p); setSaving(false); alert("Saved!")
  }
  async function del(id: string) { if (!confirm("Delete?")) return; await deleteProduct(id); setProducts(await getProducts()); if (selected?.id === id) reset() }

  const inp = "w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-sm text-[#f5f5f5] placeholder-[#525252] outline-none focus:border-ocean"

  return (
    <div className="pt-20 pb-10 px-4 md:px-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold">Products &amp; Services</h1><p className="text-sm text-[#a3a3a3] mt-0.5">Define what you sell so agents can match and pitch it</p></div>
        <button onClick={reset} className="px-4 py-2 bg-ocean text-white text-sm font-semibold rounded-lg hover:bg-sky-500 transition-colors">+ Add Product</button>
      </div>
      <div className="grid md:grid-cols-[240px_1fr] gap-6">
        <div className="space-y-2">
          {products.length === 0 && <p className="text-xs text-[#525252] px-1">No products yet.</p>}
          {products.map(p => (
            <div key={p.id} onClick={() => select(p)} className={`p-3 rounded-xl border cursor-pointer transition-colors ${selected?.id === p.id ? "bg-ocean/10 border-ocean" : "bg-[#111] border-[#1a1a1a] hover:border-[#2a2a2a]"}`}>
              <div className="flex justify-between"><span className="text-sm font-medium">{p.name}</span><button onClick={e => { e.stopPropagation(); void del(p.id) }} className="text-[#525252] hover:text-red-400 text-xs">✕</button></div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded mt-1 inline-block ${p.type === "service" ? "bg-purple-900 text-purple-300" : "bg-blue-900 text-blue-300"}`}>{p.type}</span>
              <p className="text-xs text-[#525252] mt-1 line-clamp-2">{p.valueProposition}</p>
            </div>
          ))}
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="block text-xs text-[#a3a3a3] mb-1">Name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Product or service name" className={inp} /></div>
            <div><label className="block text-xs text-[#a3a3a3] mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as "product" | "service" }))} className={inp}>
                <option value="product">Product</option><option value="service">Service</option>
              </select>
            </div>
          </div>
          <div><label className="block text-xs text-[#a3a3a3] mb-1">Description</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="What it is" className={`${inp} resize-none`} /></div>
          <div><label className="block text-xs text-[#a3a3a3] mb-1">Value Proposition *</label><textarea value={form.valueProposition} onChange={e => setForm(f => ({ ...f, valueProposition: e.target.value }))} rows={2} placeholder="We help [customer] achieve [outcome] by [mechanism]" className={`${inp} resize-none`} /></div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="block text-xs text-[#a3a3a3] mb-1">Pricing Model</label>
              <select value={form.pricing.model} onChange={e => setForm(f => ({ ...f, pricing: { ...f.pricing, model: e.target.value as Product["pricing"]["model"] } }))} className={inp}>
                {(["free", "one-time", "subscription", "usage-based", "custom"] as const).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div><label className="block text-xs text-[#a3a3a3] mb-1">Starting Price</label><input value={form.pricing.startingAt ?? ""} onChange={e => setForm(f => ({ ...f, pricing: { ...f.pricing, startingAt: e.target.value } }))} placeholder="$49/mo" className={inp} /></div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="block text-xs text-[#a3a3a3] mb-1">Key Benefits</label><TagInput value={form.keyBenefits} onChange={v => setForm(f => ({ ...f, keyBenefits: v }))} placeholder="Save 10 hrs/week…" /></div>
            <div><label className="block text-xs text-[#a3a3a3] mb-1">Problems It Solves</label><TagInput value={form.targetProblems} onChange={v => setForm(f => ({ ...f, targetProblems: v }))} placeholder="Manual data entry…" /></div>
            <div><label className="block text-xs text-[#a3a3a3] mb-1">Unique Selling Points</label><TagInput value={form.uniqueSellingPoints} onChange={v => setForm(f => ({ ...f, uniqueSellingPoints: v }))} placeholder="AI-powered, no-code…" /></div>
            <div><label className="block text-xs text-[#a3a3a3] mb-1">Target ICPs</label>
              <div className="flex flex-wrap gap-2">
                {icps.map(icp => <button key={icp.id} type="button" onClick={() => { const has = form.targetICPIds.includes(icp.id); setForm(f => ({ ...f, targetICPIds: has ? f.targetICPIds.filter(i => i !== icp.id) : [...f.targetICPIds, icp.id] })) }} className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${form.targetICPIds.includes(icp.id) ? "bg-ocean/20 border-ocean text-ocean" : "bg-[#1a1a1a] border-[#2a2a2a] text-[#a3a3a3] hover:border-[#3a3a3a]"}`}>{icp.name}</button>)}
                {icps.length === 0 && <span className="text-xs text-[#525252]">Create ICPs first</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => void save()} disabled={saving} className="px-6 py-2.5 bg-ocean text-white text-sm font-semibold rounded-lg disabled:opacity-50 hover:bg-sky-500 transition-colors">{saving ? "Saving…" : selected ? "Update" : "Save Product"}</button>
            {selected && <button onClick={reset} className="px-4 py-2.5 border border-[#2a2a2a] text-[#a3a3a3] text-sm rounded-lg hover:border-[#3a3a3a] transition-colors">+ New</button>}
          </div>
        </div>
      </div>
    </div>
  )
}
