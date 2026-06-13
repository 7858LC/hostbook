"use client"
import { useEffect, useState } from "react"
import type { Product, ICP } from "@/types/navigator"

const EMPTY: Omit<Product, "id" | "createdAt"> = {
  name: "",
  type: "product",
  description: "",
  valueProposition: "",
  keyBenefits: [],
  targetICPIds: [],
  pricing: { model: "subscription" },
  uniqueSellingPoints: [],
  targetProblems: [],
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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [icps, setICPs] = useState<ICP[]>([])
  const [selected, setSelected] = useState<Product | null>(null)
  const [form, setForm] = useState<Omit<Product, "id" | "createdAt">>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void Promise.all([
      fetch("/api/navigator/products").then(r => r.json()).then((d: { products: Product[] }) => setProducts(d.products ?? [])),
      fetch("/api/navigator/icp").then(r => r.json()).then((d: { icps: ICP[] }) => setICPs(d.icps ?? [])),
    ]).finally(() => setLoading(false))
  }, [])

  function select(p: Product) {
    setSelected(p)
    setForm({ name: p.name, type: p.type, description: p.description, valueProposition: p.valueProposition, keyBenefits: [...p.keyBenefits], targetICPIds: [...p.targetICPIds], pricing: { ...p.pricing }, uniqueSellingPoints: [...p.uniqueSellingPoints], targetProblems: [...p.targetProblems] })
  }

  function newProduct() { setSelected(null); setForm(EMPTY) }

  async function save() {
    if (!form.name) return alert("Name is required")
    if (!form.valueProposition) return alert("Value proposition is required")
    setSaving(true)
    try {
      const payload = selected ? { ...form, id: selected.id, createdAt: selected.createdAt } : form
      const res = await fetch("/api/navigator/products", {
        method: selected ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json() as { product: Product }
      if (selected) {
        setProducts(products.map(p => p.id === data.product.id ? data.product : p))
      } else {
        setProducts([...products, data.product])
      }
      setSelected(data.product)
      alert("Saved!")
    } finally {
      setSaving(false)
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this product?")) return
    await fetch("/api/navigator/products", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    setProducts(products.filter(p => p.id !== id))
    if (selected?.id === id) { setSelected(null); setForm(EMPTY) }
  }

  if (loading) return <div className="pt-20 pb-24 md:pb-8 px-4 md:px-8 max-w-6xl mx-auto"><div className="animate-pulse h-40 bg-[#1a1a1a] rounded-xl" /></div>

  return (
    <div className="pt-20 pb-24 md:pb-8 px-4 md:px-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5]">Products &amp; Services</h1>
          <p className="text-sm text-[#a3a3a3] mt-0.5">Define what you&apos;re selling so agents can match and pitch it</p>
        </div>
        <button onClick={newProduct} className="px-4 py-2 bg-ocean text-white text-sm font-semibold rounded-lg hover:bg-sky-500 transition-colors">+ Add Product</button>
      </div>

      <div className="grid md:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar */}
        <div className="space-y-2">
          {products.length === 0 && <p className="text-xs text-[#525252] px-2">No products yet.</p>}
          {products.map(p => (
            <div key={p.id} onClick={() => select(p)}
              className={`p-3 rounded-xl border cursor-pointer transition-colors ${selected?.id === p.id ? "bg-ocean/10 border-ocean" : "bg-[#111111] border-[#1a1a1a] hover:border-[#2a2a2a]"}`}>
              <div className="flex items-start justify-between">
                <span className="text-sm font-medium text-[#f5f5f5]">{p.name}</span>
                <button onClick={e => { e.stopPropagation(); void del(p.id) }} className="text-[#525252] hover:text-red-400 text-xs">✕</button>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded mt-1 inline-block ${p.type === "service" ? "bg-purple-900 text-purple-300" : "bg-blue-900 text-blue-300"}`}>{p.type}</span>
              <p className="text-xs text-[#525252] mt-1 line-clamp-2">{p.valueProposition}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="space-y-5">
          <div className="bg-[#111111] border border-[#1a1a1a] rounded-xl p-5 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#a3a3a3] mb-1">Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Product or service name"
                  className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-sm text-[#f5f5f5] placeholder-[#525252] outline-none focus:border-ocean" />
              </div>
              <div>
                <label className="block text-xs text-[#a3a3a3] mb-1">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as "product" | "service" }))}
                  className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-sm text-[#f5f5f5] outline-none focus:border-ocean">
                  <option value="product">Product</option>
                  <option value="service">Service</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#a3a3a3] mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="What it is"
                className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-sm text-[#f5f5f5] placeholder-[#525252] outline-none focus:border-ocean resize-none" />
            </div>

            <div>
              <label className="block text-xs text-[#a3a3a3] mb-1">Value Proposition *</label>
              <textarea value={form.valueProposition} onChange={e => setForm(f => ({ ...f, valueProposition: e.target.value }))} rows={2} placeholder="We help [customer] achieve [outcome] by [mechanism]"
                className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-sm text-[#f5f5f5] placeholder-[#525252] outline-none focus:border-ocean resize-none" />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#a3a3a3] mb-1">Pricing Model</label>
                <select value={form.pricing.model} onChange={e => setForm(f => ({ ...f, pricing: { ...f.pricing, model: e.target.value as Product["pricing"]["model"] } }))}
                  className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-sm text-[#f5f5f5] outline-none focus:border-ocean">
                  {(["free", "one-time", "subscription", "usage-based", "custom"] as const).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#a3a3a3] mb-1">Starting Price</label>
                <input value={form.pricing.startingAt ?? ""} onChange={e => setForm(f => ({ ...f, pricing: { ...f.pricing, startingAt: e.target.value } }))} placeholder="e.g., $49/mo"
                  className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-sm text-[#f5f5f5] placeholder-[#525252] outline-none focus:border-ocean" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#a3a3a3] mb-1">Key Benefits</label>
                <TagInput value={form.keyBenefits} onChange={v => setForm(f => ({ ...f, keyBenefits: v }))} placeholder="Save 10 hours/week…" />
              </div>
              <div>
                <label className="block text-xs text-[#a3a3a3] mb-1">Problems It Solves</label>
                <TagInput value={form.targetProblems} onChange={v => setForm(f => ({ ...f, targetProblems: v }))} placeholder="Manual data entry…" />
              </div>
              <div>
                <label className="block text-xs text-[#a3a3a3] mb-1">Unique Selling Points</label>
                <TagInput value={form.uniqueSellingPoints} onChange={v => setForm(f => ({ ...f, uniqueSellingPoints: v }))} placeholder="AI-powered, no-code…" />
              </div>
              <div>
                <label className="block text-xs text-[#a3a3a3] mb-1">Target ICPs</label>
                <div className="flex flex-wrap gap-2">
                  {icps.map(icp => (
                    <button key={icp.id} type="button"
                      onClick={() => {
                        const has = form.targetICPIds.includes(icp.id)
                        setForm(f => ({ ...f, targetICPIds: has ? f.targetICPIds.filter(i => i !== icp.id) : [...f.targetICPIds, icp.id] }))
                      }}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${form.targetICPIds.includes(icp.id) ? "bg-ocean/20 border-ocean text-ocean" : "bg-[#1a1a1a] border-[#2a2a2a] text-[#a3a3a3] hover:border-[#3a3a3a]"}`}>
                      {icp.name}
                    </button>
                  ))}
                  {icps.length === 0 && <span className="text-xs text-[#525252]">Create ICPs first</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => void save()} disabled={saving}
              className="px-6 py-2.5 bg-ocean text-white text-sm font-semibold rounded-lg disabled:opacity-50 hover:bg-sky-500 transition-colors">
              {saving ? "Saving…" : selected ? "Update" : "Save Product"}
            </button>
            {selected && (
              <button onClick={newProduct} className="px-4 py-2.5 border border-[#2a2a2a] text-[#a3a3a3] text-sm rounded-lg hover:border-[#3a3a3a] transition-colors">+ New</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
