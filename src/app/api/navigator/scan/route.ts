import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getOrCreateSpreadsheet } from "@/lib/sheets"
import { getCampaigns, getICPs, saveLead, updateCampaignStats } from "@/lib/navigator/storage"
import { runCampaignScan } from "@/lib/navigator/scanner"
import { nanoid } from "nanoid"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const spreadsheetId = await getOrCreateSpreadsheet(
    session.user.email,
    (session as { accessToken?: string }).accessToken
  )

  try {
    const { campaignId } = await req.json() as { campaignId: string }
    if (!campaignId) return NextResponse.json({ error: "Missing campaignId" }, { status: 400 })

    const [campaigns, icps] = await Promise.all([
      getCampaigns(spreadsheetId),
      getICPs(spreadsheetId),
    ])

    const campaign = campaigns.find(c => c.id === campaignId)
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })

    const icp = icps.find(i => i.id === campaign.icpId)
    if (!icp) return NextResponse.json({ error: "ICP not found" }, { status: 404 })

    // Run the scan
    const rawLeads = await runCampaignScan(campaign, icp)

    // Save all discovered leads
    const savedLeads = []
    for (const rawLead of rawLeads.slice(0, campaign.settings.dailyLimit)) {
      const lead = await saveLead(spreadsheetId, {
        ...rawLead,
        id: nanoid(10),
        campaignId: campaign.id,
      })
      savedLeads.push(lead)
    }

    // Update campaign stats
    await updateCampaignStats(spreadsheetId, campaignId, { discovered: savedLeads.length })

    return NextResponse.json({
      discovered: savedLeads.length,
      leads: savedLeads,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
