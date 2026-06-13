import type { TradesLead, Buyer } from "@/types/leads"
import { supabase } from "./supabase"

const KEY = "lf_store"
type Store = { leads: TradesLead[]; buyers: Buyer[] }

function localLoad(): Store {
  if (typeof window === "undefined") return { leads: [], buyers: [] }
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Store } catch { return { leads: [], buyers: [] } }
}
function localSave(s: Store) { if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(s)) }

export async function getLead(id: string): Promise<TradesLead | null> {
  if (supabase) {
    const { data } = await supabase.from("trades_leads").select("data").eq("id", id).single()
    return data ? (data.data as TradesLead) : null
  }
  const s = localLoad()
  return s.leads.find(l => l.id === id) ?? null
}

export async function getLeads(status?: string): Promise<TradesLead[]> {
  if (supabase) {
    let q = supabase.from("trades_leads").select("data").order("created_at", { ascending: false })
    if (status) q = q.eq("status", status)
    const { data } = await q
    return (data ?? []).map((r: { data: unknown }) => r.data as TradesLead)
  }
  const s = localLoad()
  return status ? s.leads.filter(l => l.status === status) : s.leads
}

export async function saveLead(lead: TradesLead): Promise<void> {
  if (supabase) {
    await supabase.from("trades_leads").upsert({ id: lead.id, status: lead.status, trade_type: lead.tradeType, urgency: lead.urgency, estimated_value: lead.estimatedValue, data: lead })
    return
  }
  const s = localLoad()
  const idx = s.leads.findIndex(l => l.id === lead.id)
  if (idx >= 0) s.leads[idx] = lead; else s.leads.unshift(lead)
  localSave(s)
}

export async function saveLeads(leads: TradesLead[]): Promise<void> {
  for (const l of leads) await saveLead(l)
}

export async function updateLeadStatus(id: string, status: TradesLead["status"], extra?: Partial<TradesLead>): Promise<void> {
  if (supabase) {
    const { data } = await supabase.from("trades_leads").select("data").eq("id", id).single()
    if (!data) return
    const updated = { ...(data.data as TradesLead), ...extra, status }
    await supabase.from("trades_leads").update({ status, data: updated }).eq("id", id)
    return
  }
  const s = localLoad()
  const l = s.leads.find(x => x.id === id)
  if (l) { Object.assign(l, extra, { status }); localSave(s) }
}

export async function getBuyers(activeOnly = true): Promise<Buyer[]> {
  if (supabase) {
    let q = supabase.from("buyers").select("data")
    if (activeOnly) q = q.eq("active", true)
    const { data } = await q
    return (data ?? []).map((r: { data: unknown }) => r.data as Buyer)
  }
  const s = localLoad()
  return activeOnly ? s.buyers.filter(b => b.active) : s.buyers
}

export async function saveBuyer(buyer: Buyer): Promise<void> {
  if (supabase) {
    await supabase.from("buyers").upsert({ id: buyer.id, email: buyer.email, active: buyer.active, data: buyer })
    return
  }
  const s = localLoad()
  const idx = s.buyers.findIndex(b => b.id === buyer.id)
  if (idx >= 0) s.buyers[idx] = buyer; else s.buyers.push(buyer)
  localSave(s)
}

export async function deleteBuyer(id: string): Promise<void> {
  if (supabase) { await supabase.from("buyers").delete().eq("id", id); return }
  const s = localLoad(); s.buyers = s.buyers.filter(b => b.id !== id); localSave(s)
}
