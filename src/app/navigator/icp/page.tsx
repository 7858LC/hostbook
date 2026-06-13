"use client"
import { useEffect, useState } from "react"
import type { ICP, Platform } from "@/types/navigator"

const PLATFORMS: Platform[] = ["linkedin", "reddit", "google", "twitter", "facebook"]

const EMPTY_ICP: Omit<ICP, "id" | "createdAt" | "updatedAt"> = {
  name: "",
  description: "",
  who: { industries: [], jobTitles: [], companySizes: [], locations: [] },
  what: { problemsTheyFace: [], solutionsTheySeek: [], currentAlternatives: [], keyPurchaseCriteria: [] },
  why: { primaryMotivations: [], painPoints: [], desiredOutcomes: [], emotionalDrivers: [] },
  when: { purchaseTriggers: [], buyingCycle: "1-3 months", urgencySignals: [] },
  where: { platforms: [], keywords: [], searchQueries: [] },
  how: { decisionProcess: [], influencers: [], contentPreferences: [], outreachTone: "friendly", preferredChannels: [] },
}

function TagInput({ value, onChange, placeholder }: {
  value: string[]; onChange: (v: string[]) => void; placeholder?: string
}) {
  const [input, setInput] = useState("")
  function add() {
    const trimmed = input.trim()
    if (trimmed && !value.includes(trimmed)) onChange([...value, trimmed])
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
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add() } }}
        onBlur={add}
        placeholder={value.length === 0 ? placeholder : "Add more…"}
        className="flex-1 min-w-[120px] bg-transparent text-xs text-[#f5f5f5] placeholder-[#525252] outline-none"
      />
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111111] border border-[#1a1a1a] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-[#f5f5f5] mb-4 flex items-center gap-2">
        <span className="text-ocean">{icon}</span> {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-[#a3a3a3] mb-1">{label}</label>
      {hint && <p className="text-[10px] text-[#525252] mb-1">{hint}</p>}
      {children}
    </div>
  )
}

export default function ICPPage() {
  const [icps, setICPs] = useState<ICP[]>([])
  const [selected, setSelected] = useState<ICP | null>(null)
  const [form, setForm] = useState<Omit<ICP, "id" | "createdAt" | "updatedAt">>(EMPTY_ICP)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/navigator/icp")
      .then(r => r.json())
      .then((d: { icps: ICP[] }) => { setICPs(d.icps ?? []); setLoading(false) })
  }, [])

  function selectICP(icp: ICP) {
    setSelected(icp)
    setForm({
      name: icp.name, description: icp.description,
      who: { ...icp.who }, what: { ...icp.what },
      why: { ...icp.why }, when: { ...icp.when },
      where: { ...icp.where }, how: { ...icp.how },
    })
  }

  function newICP() {
    setSelected(null)
    setForm(EMPTY_ICP)
  }

  async function save() {
    if (!form.name) return alert("Name is required")
    setSaving(true)
    try {
      const payload = selected ? { ...form, id: selected.id, createdAt: selected.createdAt } : form
      const method = selected ? "PATCH" : "POST"
      const res = await fetch("/api/navigator/icp", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      })
      const data = await res.json() as { icp: ICP }
      if (selected) {
        setICPs(icps.map(i => i.id === data.icp.id ? data.icp : i))
      } else {
        setICPs([...icps, data.icp])
      }
      setSelected(data.icp)
      alert("Saved!")
    } finally {
      setSaving(false)
    }
  }

  async function deleteICP(id: string) {
    if (!confirm("Delete this ICP?")) return
    await fetch("/api/navigator/icp", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    setICPs(icps.filter(i => i.id !== id))
    if (selected?.id === id) { setSelected(null); setForm(EMPTY_ICP) }
  }

  function upd<K extends keyof typeof form>(section: K, field: string, value: unknown) {
    setForm(f => ({ ...f, [section]: { ...(f[section] as object), [field]: value } }))
  }

  if (loading) return <div className="pt-20 pb-24 md:pb-8 px-4 md:px-8 max-w-6xl mx-auto"><div className="animate-pulse h-40 bg-[#1a1a1a] rounded-xl" /></div>

  return (
    <div className="pt-20 pb-24 md:pb-8 px-4 md:px-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5]">Ideal Customer Profiles</h1>
          <p className="text-sm text-[#a3a3a3] mt-0.5">Define who, what, why, when, where &amp; how your ideal customer buys</p>
        </div>
        <button onClick={newICP} className="px-4 py-2 bg-ocean text-white text-sm font-semibold rounded-lg hover:bg-sky-500 transition-colors">+ New ICP</button>
      </div>

      <div className="grid md:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar */}
        <div className="space-y-2">
          {icps.length === 0 && <p className="text-xs text-[#525252] px-2">No ICPs yet. Create your first.</p>}
          {icps.map(icp => (
            <div key={icp.id}
              onClick={() => selectICP(icp)}
              className={`p-3 rounded-xl border cursor-pointer transition-colors ${selected?.id === icp.id ? "bg-ocean/10 border-ocean" : "bg-[#111111] border-[#1a1a1a] hover:border-[#2a2a2a]"}`}>
              <div className="flex items-start justify-between gap-1">
                <span className="text-sm font-medium text-[#f5f5f5] leading-snug">{icp.name}</span>
                <button onClick={e => { e.stopPropagation(); void deleteICP(icp.id) }} className="text-[#525252] hover:text-red-400 text-xs shrink-0">✕</button>
              </div>
              <p className="text-xs text-[#525252] mt-0.5 line-clamp-2">{icp.description}</p>
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {icp.where.platforms.map(p => (
                  <span key={p} className="px-1.5 py-0.5 text-[9px] bg-[#1a1a1a] text-[#a3a3a3] rounded">{p}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="space-y-5">
          {/* Basic info */}
          <div className="bg-[#111111] border border-[#1a1a1a] rounded-xl p-5">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Profile Name *">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Solo SaaS Founders"
                  className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-sm text-[#f5f5f5] placeholder-[#525252] outline-none focus:border-ocean" />
              </Field>
              <Field label="Description">
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="One-line description"
                  className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-sm text-[#f5f5f5] placeholder-[#525252] outline-none focus:border-ocean" />
              </Field>
            </div>
          </div>

          {/* WHO */}
          <Section title="WHO are they?" icon="◎">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Industries" hint="Press Enter to add">
                <TagInput value={form.who.industries} onChange={v => upd("who", "industries", v)} placeholder="SaaS, E-commerce…" />
              </Field>
              <Field label="Job Titles">
                <TagInput value={form.who.jobTitles} onChange={v => upd("who", "jobTitles", v)} placeholder="Founder, VP Sales…" />
              </Field>
              <Field label="Company Sizes">
                <TagInput value={form.who.companySizes} onChange={v => upd("who", "companySizes", v)} placeholder="1-10, 11-50…" />
              </Field>
              <Field label="Locations">
                <TagInput value={form.who.locations} onChange={v => upd("who", "locations", v)} placeholder="USA, UK, Remote…" />
              </Field>
            </div>
          </Section>

          {/* WHAT */}
          <Section title="WHAT do they buy/need?" icon="◈">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Problems They Face">
                <TagInput value={form.what.problemsTheyFace} onChange={v => upd("what", "problemsTheyFace", v)} placeholder="Manual reporting, churn…" />
              </Field>
              <Field label="Solutions They Seek">
                <TagInput value={form.what.solutionsTheySeek} onChange={v => upd("what", "solutionsTheySeek", v)} placeholder="Automation, analytics…" />
              </Field>
              <Field label="Current Alternatives">
                <TagInput value={form.what.currentAlternatives} onChange={v => upd("what", "currentAlternatives", v)} placeholder="Spreadsheets, Notion…" />
              </Field>
              <Field label="Key Purchase Criteria">
                <TagInput value={form.what.keyPurchaseCriteria} onChange={v => upd("what", "keyPurchaseCriteria", v)} placeholder="Price, ease of use…" />
              </Field>
            </div>
          </Section>

          {/* WHY */}
          <Section title="WHY do they buy?" icon="◉">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Pain Points">
                <TagInput value={form.why.painPoints} onChange={v => upd("why", "painPoints", v)} placeholder="Wasting time, losing revenue…" />
              </Field>
              <Field label="Desired Outcomes">
                <TagInput value={form.why.desiredOutcomes} onChange={v => upd("why", "desiredOutcomes", v)} placeholder="Save 10hrs/week, grow 20%…" />
              </Field>
              <Field label="Primary Motivations">
                <TagInput value={form.why.primaryMotivations} onChange={v => upd("why", "primaryMotivations", v)} placeholder="Growth, efficiency…" />
              </Field>
              <Field label="Emotional Drivers">
                <TagInput value={form.why.emotionalDrivers} onChange={v => upd("why", "emotionalDrivers", v)} placeholder="Fear of falling behind…" />
              </Field>
            </div>
          </Section>

          {/* WHEN */}
          <Section title="WHEN do they buy?" icon="◷">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Buying Cycle">
                <select value={form.when.buyingCycle} onChange={e => upd("when", "buyingCycle", e.target.value)}
                  className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-sm text-[#f5f5f5] outline-none focus:border-ocean">
                  {(["immediate", "1-4 weeks", "1-3 months", "3-12 months"] as const).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </Field>
              <Field label="Purchase Triggers">
                <TagInput value={form.when.purchaseTriggers} onChange={v => upd("when", "purchaseTriggers", v)} placeholder="Funding round, new hire…" />
              </Field>
              <Field label="Urgency Signals">
                <TagInput value={form.when.urgencySignals} onChange={v => upd("when", "urgencySignals", v)} placeholder="Deadline, event, pain…" />
              </Field>
            </div>
          </Section>

          {/* WHERE */}
          <Section title="WHERE to find them?" icon="◌">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Platforms">
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => (
                    <button key={p} type="button"
                      onClick={() => {
                        const has = form.where.platforms.includes(p)
                        upd("where", "platforms", has ? form.where.platforms.filter(x => x !== p) : [...form.where.platforms, p])
                      }}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${form.where.platforms.includes(p) ? "bg-ocean/20 border-ocean text-ocean" : "bg-[#1a1a1a] border-[#2a2a2a] text-[#a3a3a3] hover:border-[#3a3a3a]"}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Reddit Subreddits" hint="Without r/ prefix">
                <TagInput value={form.where.subreddits ?? []} onChange={v => upd("where", "subreddits", v)} placeholder="startups, SaaS, entrepreneur…" />
              </Field>
              <Field label="Keywords" hint="Used to build search queries">
                <TagInput value={form.where.keywords} onChange={v => upd("where", "keywords", v)} placeholder="lead generation, CRM…" />
              </Field>
              <Field label="Custom Search Queries" hint="Exact queries to run">
                <TagInput value={form.where.searchQueries} onChange={v => upd("where", "searchQueries", v)} placeholder="looking for CRM site:reddit.com…" />
              </Field>
            </div>
          </Section>

          {/* HOW */}
          <Section title="HOW do they buy?" icon="◫">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Outreach Tone">
                <select value={form.how.outreachTone} onChange={e => upd("how", "outreachTone", e.target.value)}
                  className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-sm text-[#f5f5f5] outline-none focus:border-ocean">
                  {(["formal", "casual", "technical", "friendly"] as const).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </Field>
              <Field label="Preferred Channels">
                <TagInput value={form.how.preferredChannels} onChange={v => upd("how", "preferredChannels", v)} placeholder="LinkedIn DM, Email, Reddit…" />
              </Field>
              <Field label="Decision Process Steps">
                <TagInput value={form.how.decisionProcess} onChange={v => upd("how", "decisionProcess", v)} placeholder="Research, trial, approval…" />
              </Field>
              <Field label="Influencers / Communities">
                <TagInput value={form.how.influencers} onChange={v => upd("how", "influencers", v)} placeholder="Indie Hackers, PH, Hacker News…" />
              </Field>
            </div>
          </Section>

          <div className="flex gap-3">
            <button onClick={() => void save()} disabled={saving}
              className="px-6 py-2.5 bg-ocean text-white text-sm font-semibold rounded-lg disabled:opacity-50 hover:bg-sky-500 transition-colors">
              {saving ? "Saving…" : selected ? "Update ICP" : "Save ICP"}
            </button>
            {selected && (
              <button onClick={newICP} className="px-4 py-2.5 border border-[#2a2a2a] text-[#a3a3a3] text-sm rounded-lg hover:border-[#3a3a3a] transition-colors">
                + New ICP
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
