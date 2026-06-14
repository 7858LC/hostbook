"use client"
import { useEffect, useState } from "react"
import { nanoid } from "nanoid"
import { getBuyers, saveBuyer, deleteBuyer } from "@/lib/storage"
import type { Buyer, TradeType } from "@/types/leads"

const TRADE_TYPES: TradeType[] = ["hvac", "plumbing", "electrical", "roofing", "general"]
const EMPTY = (): Omit<Buyer, "id" | "createdAt" | "totalLeadsClaimed" | "badge" | "verifiedAt"> => ({
  businessName: "", contactName: "", email: "", phone: "", licenseNumber: "", serviceTypes: [], coverageZips: [], coverageState: "", active: true,
})

export default function BuyersPage() {
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [form, setForm] = useState(EMPTY())
  const [selected, setSelected] = useState<Buyer | null>(null)
  const [saving, setSaving] = useState(false)
  const [zipInput, setZipInput] = useState("")

  useEffect(() => { void getBuyers(false).then(setBuyers) }, [])

  function reset() { setSelected(null); setForm(EMPTY()); setZipInput("") }
  function select(b: Buyer) { setSelected(b); setForm({ businessName: b.businessName, contactName: b.contactName, email: b.email, phone: b.phone ?? "", licenseNumber: b.licenseNumber ?? "", serviceTypes: [...b.serviceTypes], coverageZips: [...b.coverageZips], coverageState: b.coverageState ?? "", active: b.active }); setZipInput(b.coverageZips.join(", ")) }
  function toggleType(t: TradeType) { setForm(f => ({ ...f, serviceTypes: f.serviceTypes.includes(t) ? f.serviceTypes.filter(x => x !== t) : [...f.serviceTypes, t] })) }

  async function save() {
    if (!form.businessName || !form.email) return alert("Business name and email required")
    setSaving(true)
    const zips = zipInput.split(/[\s,]+/).map(z => z.trim()).filter(Boolean)
    const buyer: Buyer = { ...form, coverageZips: zips, id: selected?.id ?? nanoid(10), createdAt: selected?.createdAt ?? new Date().toISOString(), totalLeadsClaimed: selected?.totalLeadsClaimed ?? 0, badge: selected?.badge, verifiedAt: selected?.verifiedAt }
    await saveBuyer(buyer); setBuyers(await getBuyers(false)); setSelected(buyer); setSaving(false); alert("Saved!")
  }

  async function del(id: string) {
    if (!confirm("Delete buyer?")) return
    await deleteBuyer(id); setBuyers(await getBuyers(false)); if (selected?.id === id) reset()
  }

  const inp = "w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-sm text-[#f5f5f5] placeholder-[#525252] outline-none focus:border-emerald-500"

  return (
    <div className="pt-20 pb-10 px-4 md:px-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold">Buyers</h1><p className="text-sm text-[#a3a3a3] mt-0.5">Trades professionals receiving leads</p></div>
        <button onClick={reset} className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-500 transition-colors">+ Add Buyer</button>
      </div>
      <div className="grid md:grid-cols-[260px_1fr] gap-6">
        <div className="space-y-2">
          {buyers.length === 0 && <p className="text-xs text-[#525252] px-1">No buyers yet.</p>}
          {buyers.map(b => (
            <div key={b.id} onClick={() => select(b)} className={`p-3 rounded-xl border cursor-pointer transition-colors ${selected?.id === b.id ? "bg-emerald-900/20 border-emerald-700" : "bg-[#111] border-[#1a1a1a] hover:border-[#2a2a2a]"}`}>
              <div className="flex justify-between">
                <span className="text-sm font-medium flex items-center gap-1">
                  {b.businessName}
                  {b.badge === "verified" && <span title="LeadFlow Verified" className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-400 border border-amber-800/50">🏅 Verified</span>}
                </span>
                <div className="flex gap-1 items-center">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${b.active ? "bg-emerald-900 text-emerald-400" : "bg-[#2a2a2a] text-[#525252]"}`}>{b.active ? "active" : "paused"}</span>
                  <button onClick={e => { e.stopPropagation(); void del(b.id) }} className="text-[#525252] hover:text-red-400 text-xs">x</button>
                </div>
              </div>
              <p className="text-xs text-[#525252] mt-0.5">{b.email}</p>
              <div className="flex gap-1 mt-1 flex-wrap">
                {b.serviceTypes.map(t => <span key={t} className="px-1 py-0.5 text-[9px] bg-[#1a1a1a] text-[#a3a3a3] rounded uppercase">{t}</span>)}
              </div>
              <p className="text-[10px] text-[#525252] mt-1">{b.totalLeadsClaimed} leads claimed{b.licenseNumber ? ` · ${b.licenseNumber}` : ""}</p>
            </div>
          ))}
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold">{selected ? "Edit Buyer" : "New Buyer"}</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="block text-xs text-[#a3a3a3] mb-1">Business Name *</label><input value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} placeholder="Smith's HVAC" className={inp} /></div>
            <div><label className="block text-xs text-[#a3a3a3] mb-1">Contact Name</label><input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder="John Smith" className={inp} /></div>
            <div><label className="block text-xs text-[#a3a3a3] mb-1">Email *</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@smithshvac.com" className={inp} /></div>
            <div><label className="block text-xs text-[#a3a3a3] mb-1">Phone</label><input value={form.phone ?? ""} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 123-4567" className={inp} /></div>
            <div className="md:col-span-2"><label className="block text-xs text-[#a3a3a3] mb-1">License #</label><input value={form.licenseNumber ?? ""} onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))} placeholder="TACLB12345E" className={inp} /></div>
          </div>
          <div>
            <label className="block text-xs text-[#a3a3a3] mb-2">Service Types</label>
            <div className="flex gap-2 flex-wrap">
              {TRADE_TYPES.map(t => <button key={t} type="button" onClick={() => toggleType(t)} className={`px-3 py-1 text-xs rounded-lg border uppercase font-medium transition-colors ${form.serviceTypes.includes(t) ? "bg-emerald-900/40 border-emerald-700 text-emerald-400" : "bg-[#1a1a1a] border-[#2a2a2a] text-[#a3a3a3] hover:border-[#3a3a3a]"}`}>{t}</button>)}
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#a3a3a3] mb-1">Coverage Zip Codes</label>
            <textarea value={zipInput} onChange={e => setZipInput(e.target.value)} placeholder="30301, 30302, 30303  (comma or space separated)" rows={2} className={`${inp} resize-none`} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="block text-xs text-[#a3a3a3] mb-1">State</label><input value={form.coverageState ?? ""} onChange={e => setForm(f => ({ ...f, coverageState: e.target.value }))} placeholder="GA" className={inp} /></div>
            <div className="flex items-end"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="accent-emerald-500" /><span className="text-sm text-[#a3a3a3]">Active (receives leads)</span></label></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => void save()} disabled={saving} className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50 hover:bg-emerald-500 transition-colors">{saving ? "Saving…" : selected ? "Update" : "Add Buyer"}</button>
            {selected && <button onClick={reset} className="px-4 py-2.5 border border-[#2a2a2a] text-[#a3a3a3] text-sm rounded-lg hover:border-[#3a3a3a]">+ New</button>}
          </div>
        </div>
      </div>
    </div>
  )
}
