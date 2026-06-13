import Anthropic from "@anthropic-ai/sdk"
import type { ICP, Product, Lead, AnalysisResult, MessageResult } from "@/types/navigator"

function client(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured")
  return new Anthropic({ apiKey: key })
}

async function ask(system: string, prompt: string): Promise<string> {
  const r = await client().messages.create({ model: "claude-sonnet-4-6", max_tokens: 4096, system, messages: [{ role: "user", content: prompt }] })
  const b = r.content[0]
  if (b.type !== "text") throw new Error("Unexpected response")
  return b.text
}

function parseJSON<T>(raw: string, fallback: T): T {
  const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  try { return JSON.parse((m ? m[1]! : raw).trim()) as T } catch { return fallback }
}

function demoAnalysis(leads: Lead[]): AnalysisResult[] {
  return leads.map(l => ({
    leadId: l.id,
    icpScore: 55 + Math.floor(Math.random() * 35),
    buyingIntent: (["high", "medium", "low"] as const)[Math.floor(Math.random() * 3)],
    matchReasons: ["Matches target industry", "Expressed relevant pain point"],
    riskFactors: ["Limited profile data"],
    estimatedStage: (["awareness", "consideration", "decision"] as const)[Math.floor(Math.random() * 3)],
    analysisNotes: "Demo mode — add ANTHROPIC_API_KEY for real AI analysis",
    pass: true,
  }))
}

function demoMessage(lead: Lead, product: Product): MessageResult {
  return {
    leadId: lead.id,
    message: `Hey ${lead.name ?? "there"}!\n\nSaw your post about "${lead.signalText.slice(0, 80)}..." — sounds like exactly what we help with.\n\n${product.name} ${product.valueProposition.toLowerCase()}.\n\nWorth a quick chat? Happy to show you how we've helped others in your situation.`,
    personalizationNotes: "Demo message — add ANTHROPIC_API_KEY for personalized AI copy",
    channel: lead.platform === "linkedin" ? "LinkedIn DM" : "Email",
  }
}

export async function analyzeLeads(leads: Lead[], icp: ICP, product: Product): Promise<AnalysisResult[]> {
  if (!process.env.ANTHROPIC_API_KEY) return demoAnalysis(leads)
  const raw = await ask(
    "You are a B2B sales analyst. Score leads against an ICP. Return ONLY valid JSON.",
    `Score these ${leads.length} leads against the ICP and product. Return JSON array only.

ICP: ${icp.name} | Industries: ${icp.who.industries.join(", ")} | Titles: ${icp.who.jobTitles.join(", ")} | Pain Points: ${icp.why.painPoints.join(", ")} | Triggers: ${icp.when.purchaseTriggers.join(", ")}
Product: ${product.name} — ${product.valueProposition} — Solves: ${product.targetProblems.join(", ")}

Leads: ${JSON.stringify(leads.map(l => ({ id: l.id, name: l.name, title: l.title, company: l.company, signal: l.signalText.slice(0, 200), platform: l.platform })))}

Return: [{"leadId":"","icpScore":0-100,"buyingIntent":"high"|"medium"|"low","matchReasons":[],"riskFactors":[],"estimatedStage":"awareness"|"consideration"|"decision","analysisNotes":"","pass":boolean}]`
  )
  return parseJSON<AnalysisResult[]>(raw, demoAnalysis(leads))
}

export async function generateMessages(leads: Lead[], product: Product, icp: ICP, style: string): Promise<MessageResult[]> {
  if (!process.env.ANTHROPIC_API_KEY) return leads.map(l => demoMessage(l, product))
  const styleGuide = { formal: "Professional, no emojis, use titles", casual: "Conversational, first names, friendly", technical: "Technical and data-driven, be precise", friendly: "Warm and helpful, genuinely curious" }
  const raw = await ask(
    "You are a B2B copywriter who writes personalized cold outreach that gets replies. Return ONLY valid JSON.",
    `Write personalized outreach for these leads. Under 150 words each. ${styleGuide[style as keyof typeof styleGuide] ?? styleGuide.friendly}. Reference their specific signal/post.

Product: ${product.name} — ${product.valueProposition}
Benefits: ${product.keyBenefits.join(", ")}

Leads: ${JSON.stringify(leads.map(l => ({ id: l.id, name: l.name ?? "there", title: l.title, company: l.company, platform: l.platform, signal: l.signalText.slice(0, 250), intent: l.buyingIntent })))}

Return: [{"leadId":"","message":"","personalizationNotes":"","channel":""}]`
  )
  return parseJSON<MessageResult[]>(raw, leads.map(l => demoMessage(l, product)))
}

export async function runAutopilot(
  leads: Lead[], icp: ICP, product: Product,
  settings: { messagingStyle: string; autoApproveThreshold: number }
): Promise<Lead[]> {
  const analysisResults = await analyzeLeads(leads, icp, product)
  const analyzed = leads.map(l => {
    const r = analysisResults.find(x => x.leadId === l.id)
    if (!r) return { ...l, status: "rejected" as const, updatedAt: new Date().toISOString() }
    return { ...l, icpScore: r.icpScore, buyingIntent: r.buyingIntent, matchReasons: r.matchReasons, riskFactors: r.riskFactors, estimatedStage: r.estimatedStage, analysisNotes: r.analysisNotes, matchedProductId: product.id, status: r.pass ? ("vetted" as const) : ("rejected" as const), updatedAt: new Date().toISOString() }
  })
  const toApprove = analyzed.filter(l => l.status === "vetted" && (l.icpScore ?? 0) >= settings.autoApproveThreshold).map(l => ({ ...l, status: "approved" as const }))
  const notApproved = analyzed.filter(l => l.status !== "vetted" || (l.icpScore ?? 0) < settings.autoApproveThreshold)
  if (toApprove.length === 0) return [...analyzed, ...notApproved]
  const msgResults = await generateMessages(toApprove, product, icp, settings.messagingStyle)
  const messaged = toApprove.map(l => {
    const m = msgResults.find(x => x.leadId === l.id)
    return { ...l, generatedMessage: m?.message, messagePersonalizationNotes: m?.personalizationNotes, status: "messaged" as const, sentAt: new Date().toISOString(), sentChannel: m?.channel, updatedAt: new Date().toISOString() }
  })
  return [...notApproved, ...messaged]
}
