"use client"
import type { ICP, Product, Campaign, Lead } from "@/types/navigator"
import { supabase } from "./supabase"

type Store = { icps: ICP[]; products: Product[]; campaigns: Campaign[]; leads: Lead[] }
const KEY = "icn_store"

function localLoad(): Store {
  if (typeof window === "undefined") return { icps: [], products: [], campaigns: [], leads: [] }
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Store } catch { return { icps: [], products: [], campaigns: [], leads: [] } }
}
function localSave(s: Store) { if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(s)) }

// ICPs
export async function getICPs(): Promise<ICP[]> {
  if (supabase) {
    const { data } = await supabase.from("icps").select("data")
    return (data ?? []).map((r: { data: unknown }) => r.data as ICP)
  }
  return localLoad().icps ?? []
}
export async function saveICP(icp: ICP): Promise<ICP> {
  if (supabase) { await supabase.from("icps").upsert({ id: icp.id, data: icp }); return icp }
  const s = localLoad(); const idx = s.icps.findIndex(i => i.id === icp.id)
  if (idx >= 0) s.icps[idx] = icp; else s.icps.push(icp); localSave(s); return icp
}
export async function deleteICP(id: string): Promise<void> {
  if (supabase) { await supabase.from("icps").delete().eq("id", id); return }
  const s = localLoad(); s.icps = s.icps.filter(i => i.id !== id); localSave(s)
}

// Products
export async function getProducts(): Promise<Product[]> {
  if (supabase) {
    const { data } = await supabase.from("products").select("data")
    return (data ?? []).map((r: { data: unknown }) => r.data as Product)
  }
  return localLoad().products ?? []
}
export async function saveProduct(p: Product): Promise<Product> {
  if (supabase) { await supabase.from("products").upsert({ id: p.id, data: p }); return p }
  const s = localLoad(); const idx = s.products.findIndex(x => x.id === p.id)
  if (idx >= 0) s.products[idx] = p; else s.products.push(p); localSave(s); return p
}
export async function deleteProduct(id: string): Promise<void> {
  if (supabase) { await supabase.from("products").delete().eq("id", id); return }
  const s = localLoad(); s.products = s.products.filter(p => p.id !== id); localSave(s)
}

// Campaigns
export async function getCampaigns(): Promise<Campaign[]> {
  if (supabase) {
    const { data } = await supabase.from("campaigns").select("data")
    return (data ?? []).map((r: { data: unknown }) => r.data as Campaign)
  }
  return localLoad().campaigns ?? []
}
export async function saveCampaign(c: Campaign): Promise<Campaign> {
  if (supabase) { await supabase.from("campaigns").upsert({ id: c.id, data: c }); return c }
  const s = localLoad(); const idx = s.campaigns.findIndex(x => x.id === c.id)
  if (idx >= 0) s.campaigns[idx] = c; else s.campaigns.push(c); localSave(s); return c
}
export async function deleteCampaign(id: string): Promise<void> {
  if (supabase) { await supabase.from("campaigns").delete().eq("id", id); return }
  const s = localLoad(); s.campaigns = s.campaigns.filter(c => c.id !== id); localSave(s)
}
export async function updateCampaignStats(id: string, delta: Partial<Campaign["stats"]>): Promise<void> {
  if (supabase) {
    const { data } = await supabase.from("campaigns").select("data").eq("id", id).single()
    if (!data) return
    const c = data.data as Campaign
    c.stats.discovered += delta.discovered ?? 0; c.stats.vetted += delta.vetted ?? 0
    c.stats.approved += delta.approved ?? 0; c.stats.messaged += delta.messaged ?? 0
    c.stats.responded += delta.responded ?? 0; c.stats.converted += delta.converted ?? 0
    c.lastRunAt = new Date().toISOString()
    await supabase.from("campaigns").update({ data: c }).eq("id", id); return
  }
  const s = localLoad(); const c = s.campaigns.find(x => x.id === id); if (!c) return
  c.stats.discovered += delta.discovered ?? 0; c.stats.vetted += delta.vetted ?? 0
  c.stats.approved += delta.approved ?? 0; c.stats.messaged += delta.messaged ?? 0
  c.stats.responded += delta.responded ?? 0; c.stats.converted += delta.converted ?? 0
  c.lastRunAt = new Date().toISOString(); localSave(s)
}

// Leads
export async function getLeads(campaignId?: string): Promise<Lead[]> {
  if (supabase) {
    let q = supabase.from("leads").select("data")
    if (campaignId) q = q.eq("campaign_id", campaignId)
    const { data } = await q
    return (data ?? []).map((r: { data: unknown }) => r.data as Lead)
  }
  const s = localLoad()
  return campaignId ? s.leads.filter(l => l.campaignId === campaignId) : s.leads
}
export async function saveLead(l: Lead): Promise<Lead> {
  if (supabase) { await supabase.from("leads").upsert({ id: l.id, campaign_id: l.campaignId, status: l.status, data: l }); return l }
  const s = localLoad(); const idx = s.leads.findIndex(x => x.id === l.id)
  if (idx >= 0) s.leads[idx] = l; else s.leads.push(l); localSave(s); return l
}
export async function saveLeads(leads: Lead[]): Promise<void> {
  if (supabase) {
    await supabase.from("leads").upsert(leads.map(l => ({ id: l.id, campaign_id: l.campaignId, status: l.status, data: l }))); return
  }
  const s = localLoad()
  for (const l of leads) { const idx = s.leads.findIndex(x => x.id === l.id); if (idx >= 0) s.leads[idx] = l; else s.leads.push(l) }
  localSave(s)
}
export async function deleteLead(id: string): Promise<void> {
  if (supabase) { await supabase.from("leads").delete().eq("id", id); return }
  const s = localLoad(); s.leads = s.leads.filter(l => l.id !== id); localSave(s)
}
export async function updateLeadStatus(id: string, status: Lead["status"], updates?: Partial<Lead>): Promise<Lead | null> {
  if (supabase) {
    const { data } = await supabase.from("leads").select("data").eq("id", id).single()
    if (!data) return null
    const l = { ...(data.data as Lead), ...updates, status, updatedAt: new Date().toISOString() }
    await supabase.from("leads").update({ status, data: l }).eq("id", id); return l
  }
  const s = localLoad(); const l = s.leads.find(x => x.id === id); if (!l) return null
  Object.assign(l, updates, { status, updatedAt: new Date().toISOString() }); localSave(s); return l
}
export async function clearAll(): Promise<void> {
  if (supabase) {
    await supabase.from("leads").delete().neq("id", "")
    await supabase.from("campaigns").delete().neq("id", "")
    await supabase.from("products").delete().neq("id", "")
    await supabase.from("icps").delete().neq("id", "")
    return
  }
  localSave({ icps: [], products: [], campaigns: [], leads: [] })
}
