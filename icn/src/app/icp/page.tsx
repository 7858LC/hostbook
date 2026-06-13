"use client"
import { useEffect, useState } from "react"
import { nanoid } from "nanoid"
import { getICPs, saveICP, deleteICP } from "@/lib/storage"
import { TagInput } from "@/components/TagInput"
import type { ICP, Platform } from "@/types/navigator"

const PLATFORMS: Platform[] = ["linkedin", "reddit", "google", "twitter", "facebook"]
const EMPTY = (): Omit<ICP, "id" | "createdAt" | "updatedAt"> => ({
  name: "", description: "",
  who: { industries: [], jobTitles: [], companySizes: [], locations: [] },
  what: { problemsTheyFace: [], solutionsTheySeek: [], currentAlternatives: [], keyPurchaseCriteria: [] },
  why: { primaryMotivations: [], painPoints: [], desiredOutcomes: [], emotionalDrivers: [] },
  when: { purchaseTriggers: [], buyingCycle: "1-3 months", urgencySignals: [] },
  where: { platforms: [], keywords: [], searchQueries: [] },
  how: { decisionProcess: [], influencers: [], outreachTone: "friendly", preferredChannels: [] },
})

function F({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <div><label className="block text-xs text-[#a3a3a3] mb-1">{label}</label>{hint && <p className="text-[10px] text-[#525252] mb-1">{hint}</p>}{children}</div>
}
function S({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5">
      <h3 className="text-sm font-semibold mb-4"><span className="text-ocean mr-2">{icon}</span>{title}</h3>
      <div className="grid md:grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

export default function ICPPage() {
  const [icps, setICPs] = useState<ICP[]>([])
  const [selected, setSelected] = useState<ICP | null>(null)
  const [form, setForm] = useState(EMPTY())
  const [saving, setSaving] = useState(false)

  useEffect(() => { setICPs(getICPs()) }, [])

  function select(icp: ICP) { setSelected(icp); setForm({ name: icp.name, description: icp.description, who: { ...icp.who }, what: { ...icp.what }, why: { ...icp.why }, when: { ...icp.when }, where: { ...icp.where }, how: { ...icp.how } }) }
  function reset() { setSelected(null); setForm(EMPTY()) }
  function upd<K extends keyof ReturnType<typeof EMPTY>>(section: K, field: string, value: unknown) {
    setForm(f => ({ ...f, [section]: { ...(f[section] as object), [field]: value } }))
  }

  function save() {
    if (!form.name) return alert("Name required")
    setSaving(true)
    const now = new Date().toISOString()
    const icp: ICP = { ...form, id: selected?.id ?? nanoid(10), createdAt: selected?.createdAt ?? now, updatedAt: now }
    saveICP(icp)
    const updated = getICPs()
    setICPs(updated)
    setSelected(icp)
    setSaving(false)
    alert("Saved!")
  }

  function del(id: string) {
    if (!confirm("Delete?")) return
    deleteICP(id); setICPs(getICPs())
    if (selected?.id === id) reset()
  }

  const inp = "w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-sm text-[#f5f5f5] placeholder-[#525252] outline-none focus:border-ocean"
  const sel = `${inp} appearance-none`

  return (
    <div className="pt-20 pb-10 px-4 md:px-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold">Ideal Customer Profiles</h1><p className="text-sm text-[#a3a3a3] mt-0.5">Who, What, Why, When, Where &amp; How your ideal buyer buys</p></div>
        <button onClick={reset} className="px-4 py-2 bg-ocean text-white text-sm font-semibold rounded-lg hover:bg-sky-500 transition-colors">+ New ICP</button>
      </div>
      <div className="grid md:grid-cols-[240px_1fr] gap-6">
        <div className="space-y-2">
          {icps.length === 0 && <p className="text-xs text-[#525252] px-1">No ICPs yet.</p>}
          {icps.map(icp => (
            <div key={icp.id} onClick={() => select(icp)}
              className={`p-3 rounded-xl border cursor-pointer transition-colors ${selected?.id === icp.id ? "bg-ocean/10 border-ocean" : "bg-[#111] border-[#1a1a1a] hover:border-[#2a2a2a]"}`}>
              <div className="flex justify-between"><span className="text-sm font-medium">{icp.name}</span><button onClick={e => { e.stopPropagation(); del(icp.id) }} className="text-[#525252] hover:text-red-400 text-xs">✕</button></div>
              <p className="text-xs text-[#525252] mt-0.5 line-clamp-2">{icp.description}</p>
              <div className="flex gap-1 mt-1 flex-wrap">{icp.where.platforms.map(p => <span key={p} className="px-1 py-0.5 text-[9px] bg-[#1a1a1a] text-[#a3a3a3] rounded">{p}</span>)}</div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 grid md:grid-cols-2 gap-4">
            <F label="Profile Name *"><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Solo SaaS Founders" className={inp} /></F>
            <F label="Description"><input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="One-line summary" className={inp} /></F>
          </div>
          <S title="WHO are they?" icon="◎">
            <F label="Industries" hint="Press Enter to add"><TagInput value={form.who.industries} onChange={v => upd("who", "industries", v)} placeholder="SaaS, E-commerce…" /></F>
            <F label="Job Titles"><TagInput value={form.who.jobTitles} onChange={v => upd("who", "jobTitles", v)} placeholder="Founder, VP Sales…" /></F>
            <F label="Company Sizes"><TagInput value={form.who.companySizes} onChange={v => upd("who", "companySizes", v)} placeholder="1-10, 11-50…" /></F>
            <F label="Locations"><TagInput value={form.who.locations} onChange={v => upd("who", "locations", v)} placeholder="USA, UK, Remote…" /></F>
          </S>
          <S title="WHAT do they need?" icon="◈">
            <F label="Problems They Face"><TagInput value={form.what.problemsTheyFace} onChange={v => upd("what", "problemsTheyFace", v)} placeholder="Manual reporting, churn…" /></F>
            <F label="Solutions They Seek"><TagInput value={form.what.solutionsTheySeek} onChange={v => upd("what", "solutionsTheySeek", v)} placeholder="Automation, analytics…" /></F>
            <F label="Current Alternatives"><TagInput value={form.what.currentAlternatives} onChange={v => upd("what", "currentAlternatives", v)} placeholder="Spreadsheets, Notion…" /></F>
            <F label="Key Purchase Criteria"><TagInput value={form.what.keyPurchaseCriteria} onChange={v => upd("what", "keyPurchaseCriteria", v)} placeholder="Price, ease of use…" /></F>
          </S>
          <S title="WHY do they buy?" icon="◉">
            <F label="Pain Points"><TagInput value={form.why.painPoints} onChange={v => upd("why", "painPoints", v)} placeholder="Wasting time, losing revenue…" /></F>
            <F label="Desired Outcomes"><TagInput value={form.why.desiredOutcomes} onChange={v => upd("why", "desiredOutcomes", v)} placeholder="Save 10hrs/week…" /></F>
            <F label="Primary Motivations"><TagInput value={form.why.primaryMotivations} onChange={v => upd("why", "primaryMotivations", v)} placeholder="Growth, efficiency…" /></F>
            <F label="Emotional Drivers"><TagInput value={form.why.emotionalDrivers} onChange={v => upd("why", "emotionalDrivers", v)} placeholder="Fear of falling behind…" /></F>
          </S>
          <S title="WHEN do they buy?" icon="◷">
            <F label="Buying Cycle">
              <select value={form.when.buyingCycle} onChange={e => upd("when", "buyingCycle", e.target.value)} className={sel}>
                {(["immediate", "1-4 weeks", "1-3 months", "3-12 months"] as const).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </F>
            <F label="Purchase Triggers"><TagInput value={form.when.purchaseTriggers} onChange={v => upd("when", "purchaseTriggers", v)} placeholder="Funding round, new hire…" /></F>
            <F label="Urgency Signals"><TagInput value={form.when.urgencySignals} onChange={v => upd("when", "urgencySignals", v)} placeholder="Deadline, growth spike…" /></F>
          </S>
          <S title="WHERE to find them?" icon="◌">
            <F label="Platforms">
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => (
                  <button key={p} type="button" onClick={() => { const has = form.where.platforms.includes(p); upd("where", "platforms", has ? form.where.platforms.filter(x => x !== p) : [...form.where.platforms, p]) }}
                    className={`px-3 py-1 text-xs rounded-lg border transition-colors ${form.where.platforms.includes(p) ? "bg-ocean/20 border-ocean text-ocean" : "bg-[#1a1a1a] border-[#2a2a2a] text-[#a3a3a3] hover:border-[#3a3a3a]"}`}>{p}</button>
                ))}
              </div>
            </F>
            <F label="Subreddits" hint="Without r/ prefix"><TagInput value={form.where.subreddits ?? []} onChange={v => upd("where", "subreddits", v)} placeholder="startups, SaaS…" /></F>
            <F label="Keywords"><TagInput value={form.where.keywords} onChange={v => upd("where", "keywords", v)} placeholder="lead gen, CRM…" /></F>
            <F label="Custom Search Queries"><TagInput value={form.where.searchQueries} onChange={v => upd("where", "searchQueries", v)} placeholder="looking for CRM reddit…" /></F>
          </S>
          <S title="HOW do they buy?" icon="◫">
            <F label="Outreach Tone">
              <select value={form.how.outreachTone} onChange={e => upd("how", "outreachTone", e.target.value)} className={sel}>
                {(["formal", "casual", "technical", "friendly"] as const).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </F>
            <F label="Preferred Channels"><TagInput value={form.how.preferredChannels} onChange={v => upd("how", "preferredChannels", v)} placeholder="LinkedIn DM, Email…" /></F>
            <F label="Decision Process"><TagInput value={form.how.decisionProcess} onChange={v => upd("how", "decisionProcess", v)} placeholder="Research, trial, approval…" /></F>
            <F label="Influencers / Communities"><TagInput value={form.how.influencers} onChange={v => upd("how", "influencers", v)} placeholder="Indie Hackers, PH…" /></F>
          </S>
          <div className="flex gap-3">
            <button onClick={save} disabled={saving} className="px-6 py-2.5 bg-ocean text-white text-sm font-semibold rounded-lg disabled:opacity-50 hover:bg-sky-500 transition-colors">{saving ? "Saving…" : selected ? "Update ICP" : "Save ICP"}</button>
            {selected && <button onClick={reset} className="px-4 py-2.5 border border-[#2a2a2a] text-[#a3a3a3] text-sm rounded-lg hover:border-[#3a3a3a] transition-colors">+ New</button>}
          </div>
        </div>
      </div>
    </div>
  )
}
