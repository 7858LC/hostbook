"use client"
import type { ICNStore, ICP, Product, Campaign, Lead } from "@/types/navigator"

const KEY = "icn_store"

function load(): ICNStore {
  if (typeof window === "undefined") return { icps: [], products: [], campaigns: [], leads: [] }
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as ICNStore) : { icps: [], products: [], campaigns: [], leads: [] }
  } catch {
    return { icps: [], products: [], campaigns: [], leads: [] }
  }
}

function save(store: ICNStore): void {
  if (typeof window === "undefined") return
  localStorage.setItem(KEY, JSON.stringify(store))
}

// ICPs
export function getICPs(): ICP[] { return load().icps }
export function saveICP(icp: ICP): ICP {
  const s = load()
  const idx = s.icps.findIndex(i => i.id === icp.id)
  if (idx >= 0) s.icps[idx] = icp; else s.icps.push(icp)
  save(s); return icp
}
export function deleteICP(id: string): void {
  const s = load(); s.icps = s.icps.filter(i => i.id !== id); save(s)
}

// Products
export function getProducts(): Product[] { return load().products }
export function saveProduct(p: Product): Product {
  const s = load()
  const idx = s.products.findIndex(x => x.id === p.id)
  if (idx >= 0) s.products[idx] = p; else s.products.push(p)
  save(s); return p
}
export function deleteProduct(id: string): void {
  const s = load(); s.products = s.products.filter(p => p.id !== id); save(s)
}

// Campaigns
export function getCampaigns(): Campaign[] { return load().campaigns }
export function saveCampaign(c: Campaign): Campaign {
  const s = load()
  const idx = s.campaigns.findIndex(x => x.id === c.id)
  if (idx >= 0) s.campaigns[idx] = c; else s.campaigns.push(c)
  save(s); return c
}
export function deleteCampaign(id: string): void {
  const s = load(); s.campaigns = s.campaigns.filter(c => c.id !== id); save(s)
}
export function updateCampaignStats(id: string, delta: Partial<Campaign["stats"]>): void {
  const s = load()
  const c = s.campaigns.find(x => x.id === id)
  if (!c) return
  c.stats.discovered += delta.discovered ?? 0
  c.stats.vetted += delta.vetted ?? 0
  c.stats.approved += delta.approved ?? 0
  c.stats.messaged += delta.messaged ?? 0
  c.stats.responded += delta.responded ?? 0
  c.stats.converted += delta.converted ?? 0
  c.lastRunAt = new Date().toISOString()
  save(s)
}

// Leads
export function getLeads(campaignId?: string): Lead[] {
  const s = load()
  return campaignId ? s.leads.filter(l => l.campaignId === campaignId) : s.leads
}
export function saveLead(l: Lead): Lead {
  const s = load()
  const idx = s.leads.findIndex(x => x.id === l.id)
  if (idx >= 0) s.leads[idx] = l; else s.leads.push(l)
  save(s); return l
}
export function saveLeads(leads: Lead[]): void {
  const s = load()
  for (const l of leads) {
    const idx = s.leads.findIndex(x => x.id === l.id)
    if (idx >= 0) s.leads[idx] = l; else s.leads.push(l)
  }
  save(s)
}
export function deleteLead(id: string): void {
  const s = load(); s.leads = s.leads.filter(l => l.id !== id); save(s)
}
export function updateLeadStatus(id: string, status: Lead["status"], updates?: Partial<Lead>): Lead | null {
  const s = load()
  const l = s.leads.find(x => x.id === id)
  if (!l) return null
  Object.assign(l, updates, { status, updatedAt: new Date().toISOString() })
  save(s); return l
}
export function clearAll(): void { save({ icps: [], products: [], campaigns: [], leads: [] }) }
