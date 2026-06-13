import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getOrCreateSpreadsheet } from "@/lib/sheets"
import {
  getCampaigns, getICPs, getProducts, getLeads,
  batchSaveLeads, updateCampaignStats,
} from "@/lib/navigator/storage"
import { runAutopilotPipeline, analyzeLeads, generateMessages } from "@/lib/navigator/agents"
import type { Lead } from "@/types/navigator"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const spreadsheetId = await getOrCreateSpreadsheet(
    session.user.email,
    (session as { accessToken?: string }).accessToken
  )

  try {
    const body = await req.json() as {
      campaignId: string
      action: "analyze" | "generate_messages" | "autopilot"
      leadIds?: string[]
    }

    const { campaignId, action, leadIds } = body

    const [campaigns, icps, products, allLeads] = await Promise.all([
      getCampaigns(spreadsheetId),
      getICPs(spreadsheetId),
      getProducts(spreadsheetId),
      getLeads(spreadsheetId, campaignId),
    ])

    const campaign = campaigns.find(c => c.id === campaignId)
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })

    const icp = icps.find(i => i.id === campaign.icpId)
    if (!icp) return NextResponse.json({ error: "ICP not found" }, { status: 404 })

    const product = products.find(p => p.id === campaign.productId)
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 })

    // Filter leads to process
    let leads: Lead[]
    if (leadIds && leadIds.length > 0) {
      leads = allLeads.filter(l => leadIds.includes(l.id))
    } else if (action === "analyze") {
      leads = allLeads.filter(l => l.status === "new")
    } else if (action === "generate_messages") {
      leads = allLeads.filter(l => l.status === "approved")
    } else {
      leads = allLeads.filter(l => l.status === "new")
    }

    if (leads.length === 0) {
      return NextResponse.json({ message: "No leads to process", processed: 0 })
    }

    if (action === "analyze") {
      const results = await analyzeLeads(leads, icp, product)
      const updatedLeads: Lead[] = leads.map(lead => {
        const result = results.find(r => r.leadId === lead.id)
        if (!result) return lead
        return {
          ...lead,
          icpScore: result.icpScore,
          buyingIntent: result.buyingIntent,
          matchReasons: result.matchReasons,
          riskFactors: result.riskFactors,
          estimatedStage: result.estimatedStage,
          analysisNotes: result.analysisNotes,
          matchedICPId: icp.id,
          status: result.pass ? ("vetted" as const) : ("rejected" as const),
          updatedAt: new Date().toISOString(),
        }
      })
      await batchSaveLeads(spreadsheetId, updatedLeads)
      const vetted = updatedLeads.filter(l => l.status === "vetted").length
      await updateCampaignStats(spreadsheetId, campaignId, { analyzed: leads.length, vetted })
      return NextResponse.json({ processed: leads.length, vetted, leads: updatedLeads })
    }

    if (action === "generate_messages") {
      const results = await generateMessages(leads, product, icp, campaign.settings.messagingStyle)
      const updatedLeads: Lead[] = leads.map(lead => {
        const result = results.find(r => r.leadId === lead.id)
        if (!result) return lead
        return {
          ...lead,
          generatedMessage: result.message,
          messagePersonalizationNotes: result.personalizationNotes,
          status: "messaged" as const,
          sentMessage: result.message,
          sentAt: new Date().toISOString(),
          sentChannel: result.channel,
          updatedAt: new Date().toISOString(),
        }
      })
      await batchSaveLeads(spreadsheetId, updatedLeads)
      await updateCampaignStats(spreadsheetId, campaignId, { messaged: leads.length })
      return NextResponse.json({ processed: leads.length, leads: updatedLeads })
    }

    if (action === "autopilot") {
      const result = await runAutopilotPipeline(leads, icp, product, {
        messagingStyle: campaign.settings.messagingStyle,
        autoApproveThreshold: campaign.settings.autoApproveThreshold,
      })
      const allUpdated = [
        ...result.analyzed.filter(l => l.status === "rejected"),
        ...result.vetted.filter(l => l.status === "rejected"),
        ...result.matched.filter(l => l.status !== "approved"),
        ...result.messaged,
      ]
      // Deduplicate by ID keeping latest
      const deduped = new Map<string, Lead>()
      for (const l of allUpdated) deduped.set(l.id, l)
      await batchSaveLeads(spreadsheetId, Array.from(deduped.values()))
      await updateCampaignStats(spreadsheetId, campaignId, {
        analyzed: leads.length,
        vetted: result.vetted.filter(l => l.status !== "rejected").length,
        approved: result.matched.filter(l => l.status === "approved").length,
        messaged: result.messaged.length,
      })
      return NextResponse.json({
        processed: leads.length,
        analyzed: result.analyzed.length,
        vetted: result.vetted.filter(l => l.status !== "rejected").length,
        messaged: result.messaged.length,
        leads: Array.from(deduped.values()),
      })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
