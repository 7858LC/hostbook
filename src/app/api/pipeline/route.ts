import { NextRequest, NextResponse } from "next/server"
import { analyzeLeads, generateMessages, runAutopilot } from "@/lib/agents"
import type { Campaign, ICP, Product, Lead } from "@/types/navigator"

export async function POST(req: NextRequest) {
  try {
    const { action, leads, icp, product, campaign } = await req.json() as {
      action: "analyze" | "generate_messages" | "autopilot"
      leads: Lead[]
      icp: ICP
      product: Product
      campaign: Campaign
    }

    if (action === "analyze") {
      const results = await analyzeLeads(leads, icp, product)
      const updated = leads.map(l => {
        const r = results.find(x => x.leadId === l.id)
        if (!r) return l
        return { ...l, icpScore: r.icpScore, buyingIntent: r.buyingIntent, matchReasons: r.matchReasons, riskFactors: r.riskFactors, estimatedStage: r.estimatedStage, analysisNotes: r.analysisNotes, status: r.pass ? ("vetted" as const) : ("rejected" as const), updatedAt: new Date().toISOString() }
      })
      return NextResponse.json({ leads: updated })
    }

    if (action === "generate_messages") {
      const results = await generateMessages(leads, product, icp, campaign.settings.messagingStyle)
      const updated = leads.map(l => {
        const m = results.find(x => x.leadId === l.id)
        if (!m) return l
        return { ...l, generatedMessage: m.message, messagePersonalizationNotes: m.personalizationNotes, status: "messaged" as const, sentAt: new Date().toISOString(), sentChannel: m.channel, updatedAt: new Date().toISOString() }
      })
      return NextResponse.json({ leads: updated })
    }

    if (action === "autopilot") {
      const processed = await runAutopilot(leads, icp, product, { messagingStyle: campaign.settings.messagingStyle, autoApproveThreshold: campaign.settings.autoApproveThreshold })
      return NextResponse.json({ leads: processed })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
