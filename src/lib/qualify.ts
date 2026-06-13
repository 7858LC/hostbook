import Anthropic from "@anthropic-ai/sdk"
import type { TradesLead, TradeType, Urgency } from "@/types/leads"

const client = new Anthropic()

interface QualResult {
  tradeType: TradeType | "unknown"
  urgency: Urgency
  location?: string
  locationState?: string
  problemSummary: string
  qualityScore: number
  estimatedValue: number
  isRelevant: boolean
  reasoning: string
}

export async function qualifyLead(lead: TradesLead): Promise<QualResult> {
  if (!process.env.ANTHROPIC_API_KEY) return mockQualify(lead)

  const prompt = `You are a lead qualification expert for a trades lead generation service (HVAC, plumbing, electrical).

Analyze this signal and determine if it's a genuine homeowner/renter looking for a trades professional.

Signal text:
"""
${lead.rawText}
"""

Source: ${lead.platform} — ${lead.sourceUrl}

Respond with a JSON object (no markdown):
{
  "tradeType": "hvac" | "plumbing" | "electrical" | "general" | "unknown",
  "urgency": "emergency" | "urgent" | "planned" | "unknown",
  "location": "city name if mentioned, else null",
  "locationState": "US state abbreviation if mentioned, else null",
  "problemSummary": "1-2 sentence description of the exact problem",
  "qualityScore": 1-10 (10 = definitely needs a pro right now, 1 = not relevant),
  "estimatedValue": 50 | 75 | 100 | 150 (based on urgency: emergency=150, urgent=100, planned=75, unknown=50),
  "isRelevant": true if this is a genuine service need, false if it's a DIY question, complaint, or irrelevant,
  "reasoning": "1 sentence explaining your score"
}`

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    })
    const text = msg.content[0].type === "text" ? msg.content[0].text : ""
    const result = JSON.parse(text.trim()) as QualResult
    return result
  } catch {
    return mockQualify(lead)
  }
}

function mockQualify(lead: TradesLead): QualResult {
  const text = lead.rawText.toLowerCase()
  const tradeType: TradeType = text.includes("hvac") || text.includes("ac") || text.includes("furnace") || text.includes("heat")
    ? "hvac" : text.includes("plumb") || text.includes("pipe") || text.includes("toilet") || text.includes("drain")
    ? "plumbing" : text.includes("electr") || text.includes("outlet") || text.includes("circuit") || text.includes("wiring")
    ? "electrical" : "general"
  const urgency: Urgency = text.includes("emergency") || text.includes("burst") || text.includes("flood") || text.includes("no power")
    ? "emergency" : text.includes("urgent") || text.includes("asap") || text.includes("broken") ? "urgent" : "planned"
  const value = urgency === "emergency" ? 150 : urgency === "urgent" ? 100 : 75
  return {
    tradeType, urgency, location: undefined, locationState: undefined,
    problemSummary: lead.problemSummary,
    qualityScore: urgency === "emergency" ? 8 : urgency === "urgent" ? 6 : 4,
    estimatedValue: value,
    isRelevant: tradeType !== "general",
    reasoning: "Mock qualification — add ANTHROPIC_API_KEY for AI scoring",
  }
}

export async function qualifyBatch(leads: TradesLead[]): Promise<TradesLead[]> {
  const results: TradesLead[] = []
  for (const lead of leads) {
    const q = await qualifyLead(lead)
    results.push({
      ...lead,
      tradeType: q.tradeType,
      urgency: q.urgency,
      location: q.location ?? undefined,
      locationState: q.locationState ?? undefined,
      problemSummary: q.problemSummary,
      qualityScore: q.qualityScore,
      estimatedValue: q.estimatedValue,
      status: q.isRelevant && q.qualityScore >= 5 ? "qualified" : "rejected",
    })
  }
  return results
}
