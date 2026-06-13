import { google } from "googleapis"
import { nanoid } from "nanoid"
import { withExponentialBackoff } from "@/lib/backoff"
import { logger } from "@/lib/logger"
import type { ICP, Product, Campaign, Lead, LeadStatus } from "@/types/navigator"

// ---------------------------------------------------------------------------
// Auth — reuse service account pattern from sheets.ts
// ---------------------------------------------------------------------------
function getAuth() {
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    ?.replace(/^["']|["'],?$/g, "")
    ?.replace(/\\n/g, "\n")
  if (!privateKey || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL)
    throw new Error("Google service account credentials not configured")
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })
}

function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getAuth() })
}

// ---------------------------------------------------------------------------
// Ensure navigator sheets exist in user's spreadsheet
// ---------------------------------------------------------------------------
const ensuredSpreadsheets = new Set<string>()

const NAV_SHEETS = ["Nav_ICPs", "Nav_Products", "Nav_Campaigns", "Nav_Leads"]

export async function ensureNavigatorSheets(spreadsheetId: string): Promise<void> {
  if (ensuredSpreadsheets.has(spreadsheetId)) return

  const sheets = getSheetsClient()
  const meta = await withExponentialBackoff(() =>
    sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties.title" })
  )
  const existing = new Set(
    (meta.data.sheets ?? []).map(s => s.properties?.title ?? "")
  )

  const toCreate = NAV_SHEETS.filter(t => !existing.has(t))
  if (toCreate.length === 0) {
    ensuredSpreadsheets.add(spreadsheetId)
    return
  }

  await withExponentialBackoff(() =>
    sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: toCreate.map(title => ({
          addSheet: { properties: { title } },
        })),
      },
    })
  )

  // Write header row for each new sheet
  const headerData = toCreate.map(title => ({
    range: `${title}!A1:B1`,
    values: [["id", "data"]],
  }))
  await withExponentialBackoff(() =>
    sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: "RAW", data: headerData },
    })
  )

  ensuredSpreadsheets.add(spreadsheetId)
  logger.info("Navigator sheets created", { spreadsheetId, sheets: toCreate })
}

// ---------------------------------------------------------------------------
// Generic read/write for id|json_data sheets
// ---------------------------------------------------------------------------
async function readAll<T>(spreadsheetId: string, sheet: string): Promise<T[]> {
  await ensureNavigatorSheets(spreadsheetId)
  const sheets = getSheetsClient()
  const res = await withExponentialBackoff(() =>
    sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheet}!A2:B` })
  )
  return (res.data.values ?? [])
    .filter(r => r[0] && r[1])
    .map(r => JSON.parse(r[1] as string) as T)
}

async function upsert<T extends { id: string }>(
  spreadsheetId: string,
  sheet: string,
  entity: T
): Promise<T> {
  await ensureNavigatorSheets(spreadsheetId)
  const sheets = getSheetsClient()
  const res = await withExponentialBackoff(() =>
    sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheet}!A2:A` })
  )
  const rows = (res.data.values ?? []) as string[][]
  const idx = rows.findIndex(r => r[0] === entity.id)

  if (idx === -1) {
    // Append new row
    await withExponentialBackoff(() =>
      sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheet}!A:B`,
        valueInputOption: "RAW",
        requestBody: { values: [[entity.id, JSON.stringify(entity)]] },
      })
    )
  } else {
    // Update existing row
    const rowNum = idx + 2
    await withExponentialBackoff(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheet}!A${rowNum}:B${rowNum}`,
        valueInputOption: "RAW",
        requestBody: { values: [[entity.id, JSON.stringify(entity)]] },
      })
    )
  }
  return entity
}

async function remove(
  spreadsheetId: string,
  sheet: string,
  id: string
): Promise<void> {
  await ensureNavigatorSheets(spreadsheetId)
  const sheets = getSheetsClient()
  const res = await withExponentialBackoff(() =>
    sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheet}!A2:A` })
  )
  const rows = (res.data.values ?? []) as string[][]
  const idx = rows.findIndex(r => r[0] === id)
  if (idx === -1) return
  const rowNum = idx + 2
  await withExponentialBackoff(() =>
    sheets.spreadsheets.values.clear({ spreadsheetId, range: `${sheet}!A${rowNum}:B${rowNum}` })
  )
}

// ---------------------------------------------------------------------------
// ICPs
// ---------------------------------------------------------------------------
export async function getICPs(spreadsheetId: string): Promise<ICP[]> {
  return readAll<ICP>(spreadsheetId, "Nav_ICPs")
}

export async function saveICP(spreadsheetId: string, icp: Omit<ICP, "id" | "createdAt" | "updatedAt"> & Partial<Pick<ICP, "id" | "createdAt" | "updatedAt">>): Promise<ICP> {
  const now = new Date().toISOString()
  const full: ICP = {
    ...icp,
    id: icp.id ?? nanoid(10),
    createdAt: icp.createdAt ?? now,
    updatedAt: now,
    who: icp.who,
    what: icp.what,
    why: icp.why,
    when: icp.when,
    where: icp.where,
    how: icp.how,
  }
  return upsert(spreadsheetId, "Nav_ICPs", full)
}

export async function deleteICP(spreadsheetId: string, id: string): Promise<void> {
  return remove(spreadsheetId, "Nav_ICPs", id)
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
export async function getProducts(spreadsheetId: string): Promise<Product[]> {
  return readAll<Product>(spreadsheetId, "Nav_Products")
}

export async function saveProduct(spreadsheetId: string, product: Omit<Product, "id" | "createdAt"> & Partial<Pick<Product, "id" | "createdAt">>): Promise<Product> {
  const full: Product = {
    ...product,
    id: product.id ?? nanoid(10),
    createdAt: product.createdAt ?? new Date().toISOString(),
  }
  return upsert(spreadsheetId, "Nav_Products", full)
}

export async function deleteProduct(spreadsheetId: string, id: string): Promise<void> {
  return remove(spreadsheetId, "Nav_Products", id)
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------
export async function getCampaigns(spreadsheetId: string): Promise<Campaign[]> {
  return readAll<Campaign>(spreadsheetId, "Nav_Campaigns")
}

export async function saveCampaign(spreadsheetId: string, campaign: Omit<Campaign, "id" | "createdAt"> & Partial<Pick<Campaign, "id" | "createdAt">>): Promise<Campaign> {
  const defaultStats = { discovered: 0, analyzed: 0, vetted: 0, approved: 0, messaged: 0, responded: 0, converted: 0 }
  const full: Campaign = {
    ...campaign,
    stats: campaign.stats ?? defaultStats,
    id: campaign.id ?? nanoid(10),
    createdAt: campaign.createdAt ?? new Date().toISOString(),
  }
  return upsert(spreadsheetId, "Nav_Campaigns", full)
}

export async function updateCampaignStats(
  spreadsheetId: string,
  campaignId: string,
  delta: Partial<Campaign["stats"]>
): Promise<void> {
  const campaigns = await getCampaigns(spreadsheetId)
  const campaign = campaigns.find(c => c.id === campaignId)
  if (!campaign) return
  const updated: Campaign = {
    ...campaign,
    stats: {
      discovered: (campaign.stats.discovered ?? 0) + (delta.discovered ?? 0),
      analyzed: (campaign.stats.analyzed ?? 0) + (delta.analyzed ?? 0),
      vetted: (campaign.stats.vetted ?? 0) + (delta.vetted ?? 0),
      approved: (campaign.stats.approved ?? 0) + (delta.approved ?? 0),
      messaged: (campaign.stats.messaged ?? 0) + (delta.messaged ?? 0),
      responded: (campaign.stats.responded ?? 0) + (delta.responded ?? 0),
      converted: (campaign.stats.converted ?? 0) + (delta.converted ?? 0),
    },
    lastRunAt: new Date().toISOString(),
  }
  await upsert(spreadsheetId, "Nav_Campaigns", updated)
}

export async function deleteCampaign(spreadsheetId: string, id: string): Promise<void> {
  return remove(spreadsheetId, "Nav_Campaigns", id)
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------
export async function getLeads(spreadsheetId: string, campaignId?: string): Promise<Lead[]> {
  const leads = await readAll<Lead>(spreadsheetId, "Nav_Leads")
  return campaignId ? leads.filter(l => l.campaignId === campaignId) : leads
}

export async function saveLead(spreadsheetId: string, lead: Omit<Lead, "id" | "discoveredAt" | "updatedAt"> & Partial<Pick<Lead, "id" | "discoveredAt" | "updatedAt">>): Promise<Lead> {
  const now = new Date().toISOString()
  const full: Lead = {
    ...lead,
    id: lead.id ?? nanoid(10),
    discoveredAt: lead.discoveredAt ?? now,
    updatedAt: now,
  }
  return upsert(spreadsheetId, "Nav_Leads", full)
}

export async function updateLeadStatus(
  spreadsheetId: string,
  leadId: string,
  status: LeadStatus,
  updates?: Partial<Lead>
): Promise<Lead | null> {
  const leads = await getLeads(spreadsheetId)
  const lead = leads.find(l => l.id === leadId)
  if (!lead) return null
  const updated: Lead = { ...lead, ...updates, status, updatedAt: new Date().toISOString() }
  await upsert(spreadsheetId, "Nav_Leads", updated)
  return updated
}

export async function batchSaveLeads(spreadsheetId: string, leads: Lead[]): Promise<void> {
  for (const lead of leads) {
    await upsert(spreadsheetId, "Nav_Leads", lead)
  }
}

export async function deleteLead(spreadsheetId: string, id: string): Promise<void> {
  return remove(spreadsheetId, "Nav_Leads", id)
}
