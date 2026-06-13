import Anthropic from "@anthropic-ai/sdk"
import type { ICP, Product, Lead, AnalysisResult, MessageResult } from "@/types/navigator"

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured")
  return new Anthropic({ apiKey })
}

async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  const client = getClient()
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  })
  const block = response.content[0]
  if (block.type !== "text") throw new Error("Unexpected response type")
  return block.text
}

function parseJSON<T>(raw: string, fallback: T): T {
  // Extract JSON from markdown code blocks if present
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  const jsonStr = match ? match[1]! : raw
  try {
    return JSON.parse(jsonStr.trim()) as T
  } catch {
    return fallback
  }
}

// ---------------------------------------------------------------------------
// Discovery Agent — generates smart search queries from ICP
// ---------------------------------------------------------------------------
export async function runDiscoveryAgent(icp: ICP, platforms: string[]): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    // Return default queries from ICP data without calling API
    return [
      ...icp.where.searchQueries.slice(0, 3),
      ...icp.where.keywords.slice(0, 2),
      ...icp.why.painPoints.slice(0, 2).map(p => `${p} solution`),
    ].slice(0, 8)
  }

  const system = `You are a B2B lead generation expert. Generate highly targeted search queries to find potential buyers on various platforms. Return ONLY a JSON array of search query strings, no explanation.`

  const prompt = `Generate 8-12 targeted search queries to find people matching this Ideal Customer Profile on ${platforms.join(", ")}.

ICP Name: ${icp.name}
Industries: ${icp.who.industries.join(", ")}
Job Titles: ${icp.who.jobTitles.join(", ")}
Pain Points: ${icp.why.painPoints.join(", ")}
Problems They Face: ${icp.what.problemsTheyFace.join(", ")}
Purchase Triggers: ${icp.when.purchaseTriggers.join(", ")}
Keywords: ${icp.where.keywords.join(", ")}

Focus on queries that reveal buying intent (asking for recommendations, expressing frustration, seeking solutions, announcing company growth triggers). Return JSON array only.`

  const raw = await callClaude(system, prompt)
  const queries = parseJSON<string[]>(raw, icp.where.searchQueries)
  return queries.slice(0, 12)
}

// ---------------------------------------------------------------------------
// Analysis Agent — scores leads against ICP
// ---------------------------------------------------------------------------
export async function analyzeLeads(
  leads: Lead[],
  icp: ICP,
  product: Product
): Promise<AnalysisResult[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    // Return mock analysis without calling API
    return leads.map(lead => ({
      leadId: lead.id,
      icpScore: Math.floor(Math.random() * 40) + 50,
      buyingIntent: (["high", "medium", "low"] as const)[Math.floor(Math.random() * 3)],
      matchReasons: ["Matches target industry", "Expressed pain point"],
      riskFactors: ["Limited profile data available"],
      estimatedStage: (["awareness", "consideration", "decision"] as const)[Math.floor(Math.random() * 3)],
      analysisNotes: "Demo analysis — configure ANTHROPIC_API_KEY for real AI analysis",
      pass: true,
    }))
  }

  const system = `You are an expert B2B sales analyst. Analyze leads against an Ideal Customer Profile and score their fit and buying intent. Return ONLY valid JSON.`

  const leadsData = leads.map(l => ({
    id: l.id,
    name: l.name,
    title: l.title,
    company: l.company,
    location: l.location,
    bio: l.bio,
    signalText: l.signalText,
    signalContext: l.signalContext,
    platform: l.platform,
  }))

  const prompt = `Analyze these ${leads.length} leads against the ICP and product below. For each lead, determine:
1. ICP fit score (0-100)
2. Buying intent (high/medium/low)
3. Top 2-3 reasons they match (or don't)
4. Risk factors
5. Estimated buying stage (awareness/consideration/decision)
6. Whether to pass them (true/false) — pass if score >= 50

ICP: ${icp.name}
- Industries: ${icp.who.industries.join(", ")}
- Job Titles: ${icp.who.jobTitles.join(", ")}
- Pain Points: ${icp.why.painPoints.join(", ")}
- Purchase Triggers: ${icp.when.purchaseTriggers.join(", ")}
- Urgency Signals: ${icp.when.urgencySignals.join(", ")}

Product: ${product.name}
- Solves: ${product.targetProblems.join(", ")}
- Value Prop: ${product.valueProposition}

Leads:
${JSON.stringify(leadsData, null, 2)}

Return JSON array matching this schema exactly:
[{
  "leadId": "string",
  "icpScore": 0-100,
  "buyingIntent": "high"|"medium"|"low",
  "matchReasons": ["string"],
  "riskFactors": ["string"],
  "estimatedStage": "awareness"|"consideration"|"decision",
  "analysisNotes": "string",
  "pass": boolean
}]`

  const raw = await callClaude(system, prompt)
  const results = parseJSON<AnalysisResult[]>(raw, [])
  return results
}

// ---------------------------------------------------------------------------
// Vetting Agent — validates lead quality and eliminates noise
// ---------------------------------------------------------------------------
export async function vetLeads(
  leads: Lead[],
  icp: ICP
): Promise<Array<{ leadId: string; valid: boolean; reason: string; enrichedData?: Partial<Lead> }>> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return leads.map(lead => ({
      leadId: lead.id,
      valid: (lead.icpScore ?? 0) >= 50,
      reason: (lead.icpScore ?? 0) >= 50 ? "Meets minimum ICP score threshold" : "Below minimum ICP score threshold",
    }))
  }

  const system = `You are a lead qualification specialist. Validate leads for real buying potential and extract any useful profile information. Return ONLY valid JSON.`

  const leadsData = leads.map(l => ({
    id: l.id,
    name: l.name,
    title: l.title,
    company: l.company,
    bio: l.bio,
    signalText: l.signalText,
    platform: l.platform,
    icpScore: l.icpScore,
    buyingIntent: l.buyingIntent,
    matchReasons: l.matchReasons,
  }))

  const prompt = `Vet these leads for validity. Reject leads that are: bot accounts, companies (not individuals), irrelevant content, duplicate signals, or spam.

Target profile: ${icp.who.jobTitles.join("/")} in ${icp.who.industries.join("/")}

Also extract any useful data from their signal text (name, title, company, contact info).

Leads:
${JSON.stringify(leadsData, null, 2)}

Return JSON array:
[{
  "leadId": "string",
  "valid": boolean,
  "reason": "brief reason",
  "enrichedData": {
    "name": "string or null",
    "title": "string or null",
    "company": "string or null",
    "email": "string or null"
  }
}]`

  const raw = await callClaude(system, prompt)
  return parseJSON(raw, leads.map(l => ({ leadId: l.id, valid: true, reason: "Default pass" })))
}

// ---------------------------------------------------------------------------
// Matching Agent — picks the best product for each lead
// ---------------------------------------------------------------------------
export async function matchLeadsToProducts(
  leads: Lead[],
  products: Product[]
): Promise<Array<{ leadId: string; productId: string; confidence: number; rationale: string }>> {
  if (products.length === 0) return []
  if (products.length === 1) {
    return leads.map(l => ({
      leadId: l.id,
      productId: products[0]!.id,
      confidence: l.icpScore ?? 70,
      rationale: `Only available product: ${products[0]!.name}`,
    }))
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return leads.map(l => ({
      leadId: l.id,
      productId: products[0]!.id,
      confidence: l.icpScore ?? 70,
      rationale: "Default product match (configure ANTHROPIC_API_KEY for AI matching)",
    }))
  }

  const system = `You are a product-market fit specialist. Match each lead to the most appropriate product/service based on their signals and needs. Return ONLY valid JSON.`

  const prompt = `Match each lead to the most appropriate product:

Products:
${products.map(p => `- ${p.id}: ${p.name} — ${p.valueProposition} — Solves: ${p.targetProblems.join(", ")}`).join("\n")}

Leads (with their signals and analysis):
${leads.map(l => `- ${l.id}: ${l.title ?? "Unknown"} at ${l.company ?? "Unknown"} | Signal: "${l.signalText.slice(0, 200)}" | Intent: ${l.buyingIntent}`).join("\n")}

Return JSON array:
[{
  "leadId": "string",
  "productId": "string",
  "confidence": 0-100,
  "rationale": "brief rationale"
}]`

  const raw = await callClaude(system, prompt)
  return parseJSON(raw, leads.map(l => ({ leadId: l.id, productId: products[0]!.id, confidence: 70, rationale: "Default match" })))
}

// ---------------------------------------------------------------------------
// Messaging Agent — generates personalized outreach messages
// ---------------------------------------------------------------------------
export async function generateMessages(
  leads: Lead[],
  product: Product,
  icp: ICP,
  style: "formal" | "casual" | "technical" | "friendly" = "friendly"
): Promise<MessageResult[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return leads.map(lead => ({
      leadId: lead.id,
      message: generateFallbackMessage(lead, product, style),
      personalizationNotes: "Demo message — configure ANTHROPIC_API_KEY for personalized AI messages",
      channel: lead.platform === "linkedin" ? "LinkedIn DM" : lead.platform === "reddit" ? "Reddit DM" : "Email",
    }))
  }

  const styleGuide = {
    formal: "Professional and formal tone. Use proper titles. Be concise and direct. No emojis.",
    casual: "Conversational and warm. First names only. Be friendly and approachable.",
    technical: "Technical and data-driven. Reference specific tools/frameworks. Be precise.",
    friendly: "Friendly and personable. Show genuine interest in their work. Be helpful, not salesy.",
  }

  const system = `You are an expert B2B copywriter specializing in personalized cold outreach that gets responses. Write messages that feel human, reference their specific situation, and provide genuine value. Never be pushy or generic. Return ONLY valid JSON.`

  const prompt = `Write personalized outreach messages for these leads. Each message should:
1. Open with something specific to their situation (reference their post/content)
2. Show you understand their problem
3. Briefly introduce how ${product.name} helps
4. End with a low-friction CTA (question or offer, not a pitch)
5. Be ${styleGuide[style]}
6. Be under 150 words

Product: ${product.name}
Value Prop: ${product.valueProposition}
Key Benefits: ${product.keyBenefits.join(", ")}

Leads:
${leads.map(l => `{
  "id": "${l.id}",
  "name": "${l.name ?? "there"}",
  "title": "${l.title ?? ""}",
  "company": "${l.company ?? ""}",
  "platform": "${l.platform}",
  "signal": "${l.signalText.slice(0, 300)}",
  "intent": "${l.buyingIntent}",
  "stage": "${l.estimatedStage}"
}`).join(",\n")}

Return JSON array:
[{
  "leadId": "string",
  "message": "the message text",
  "personalizationNotes": "what was personalized and why",
  "channel": "recommended channel"
}]`

  const raw = await callClaude(system, prompt)
  return parseJSON(raw, leads.map(l => ({
    leadId: l.id,
    message: generateFallbackMessage(l, product, style),
    personalizationNotes: "Fallback message used",
    channel: "Email",
  })))
}

function generateFallbackMessage(lead: Lead, product: Product, style: string): string {
  const name = lead.name ?? "there"
  const signal = lead.signalText.slice(0, 100)

  if (style === "formal") {
    return `Dear ${name},

I came across your post regarding "${signal}" and wanted to reach out.

At ${product.name}, we help ${product.valueProposition.toLowerCase()}.

Would you be open to a brief call to explore if this could help your situation?

Best regards`
  }

  return `Hey ${name}!

Saw your post about "${signal.slice(0, 80)}..." — sounds like exactly what we help with.

${product.name} ${product.valueProposition.toLowerCase()}.

Worth a quick chat? Happy to show you how we've helped others in your situation.`
}

// ---------------------------------------------------------------------------
// Full autopilot pipeline — runs all 4 agents in sequence
// ---------------------------------------------------------------------------
export async function runAutopilotPipeline(
  leads: Lead[],
  icp: ICP,
  product: Product,
  settings: { messagingStyle: "formal" | "casual" | "technical" | "friendly"; autoApproveThreshold?: number }
): Promise<{
  analyzed: Lead[]
  vetted: Lead[]
  matched: Lead[]
  messaged: Lead[]
}> {
  // Step 1: Analysis
  const analysisResults = await analyzeLeads(leads, icp, product)
  const analyzedLeads = leads.map(lead => {
    const result = analysisResults.find(r => r.leadId === lead.id)
    if (!result) return { ...lead, status: "rejected" as const }
    return {
      ...lead,
      icpScore: result.icpScore,
      buyingIntent: result.buyingIntent,
      matchReasons: result.matchReasons,
      riskFactors: result.riskFactors,
      estimatedStage: result.estimatedStage,
      analysisNotes: result.analysisNotes,
      status: result.pass ? ("vetted" as const) : ("rejected" as const),
      updatedAt: new Date().toISOString(),
    }
  })

  const passingLeads = analyzedLeads.filter(l => l.status === "vetted")

  // Step 2: Vetting
  const vettingResults = await vetLeads(passingLeads, icp)
  const vettedLeads = passingLeads.map(lead => {
    const result = vettingResults.find(r => r.leadId === lead.id)
    if (!result?.valid) return { ...lead, status: "rejected" as const, rejectedReason: result?.reason }
    return {
      ...lead,
      ...(result.enrichedData ?? {}),
      status: "vetted" as const,
      updatedAt: new Date().toISOString(),
    }
  })

  const validLeads = vettedLeads.filter(l => l.status === "vetted")

  // Step 3: Matching
  const matchResults = await matchLeadsToProducts(validLeads, [product])
  const matchedLeads = validLeads.map(lead => {
    const match = matchResults.find(m => m.leadId === lead.id)
    const threshold = settings.autoApproveThreshold ?? 70
    const autoApprove = (lead.icpScore ?? 0) >= threshold
    return {
      ...lead,
      matchedProductId: match?.productId ?? product.id,
      matchedICPId: icp.id,
      status: autoApprove ? ("approved" as const) : ("vetted" as const),
      approvedAt: autoApprove ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    }
  })

  const approvedLeads = matchedLeads.filter(l => l.status === "approved")

  // Step 4: Message generation
  const messageResults = await generateMessages(approvedLeads, product, icp, settings.messagingStyle)
  const messagedLeads = approvedLeads.map(lead => {
    const msg = messageResults.find(m => m.leadId === lead.id)
    return {
      ...lead,
      generatedMessage: msg?.message,
      messagePersonalizationNotes: msg?.personalizationNotes,
      status: "messaged" as const,
      sentMessage: msg?.message,
      sentAt: new Date().toISOString(),
      sentChannel: msg?.channel,
      updatedAt: new Date().toISOString(),
    }
  })

  return {
    analyzed: analyzedLeads,
    vetted: vettedLeads,
    matched: matchedLeads,
    messaged: messagedLeads,
  }
}
