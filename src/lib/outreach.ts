import type { TradesLead } from "@/types/leads"

// Short, human-sounding outreach messages.
// You copy these and post manually on Reddit/Facebook — no automation.
// Variants rotate so repeated posts don't look identical.

const TEMPLATES: Record<string, string[]> = {
  emergency_hvac: [
    "Still without AC? Have a tech available in {city} today →",
    "Saw this — can probably get someone out same day →",
    "Still need help? Know an HVAC guy in {city} who does emergency calls →",
  ],
  emergency_plumbing: [
    "Still dealing with this? Know a plumber who does emergency calls →",
    "Saw this — can get someone out fast →",
    "Still need a plumber? Have someone in {city} available today →",
  ],
  emergency_electrical: [
    "Still need an electrician? Know someone in {city} who can come out today →",
    "Saw this — can probably get a licensed tech out same day →",
    "Still without power? Know an electrician available now →",
  ],
  emergency_roofing: [
    "Still need help? Know a roofer in {city} who handles emergency calls →",
    "Saw this — can get someone to take a look today →",
    "Still dealing with this? Have a roofer available in {city} →",
  ],
  urgent_hvac: [
    "Still looking for an HVAC tech? Can get you matched with someone local →",
    "Have an HVAC contractor in {city} who might be able to help →",
    "Still need someone? →",
  ],
  urgent_plumbing: [
    "Still need a plumber? Can get you matched with someone in {city} →",
    "Have a plumber in your area who can help →",
    "Still looking? →",
  ],
  urgent_electrical: [
    "Still need an electrician? Can connect you with someone local →",
    "Have an electrician in {city} who does this kind of work →",
    "Still looking? →",
  ],
  urgent_roofing: [
    "Still need a roofer? Can connect you with someone local →",
    "Have a roofing contractor in {city} →",
    "Still looking? →",
  ],
  planned: [
    "When you're ready, can match you with a local contractor →",
    "Have a contractor in {city} who could help when you're ready →",
    "Still need someone? →",
  ],
}

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function getOutreachMessage(lead: TradesLead, intakeUrl: string): string {
  const city = lead.location ?? lead.locationState ?? "your area"
  const key = `${lead.urgency}_${lead.tradeType}`
  const templates = TEMPLATES[key] ?? TEMPLATES["planned"]
  const template = pick(templates)
  return template.replace("{city}", city) + " " + intakeUrl
}

// Timeout in minutes per urgency level before cascade advances to next buyer
export const CASCADE_TIMEOUT_MINUTES: Record<string, number> = {
  emergency: 20,
  urgent: 45,
  planned: 120,
  unknown: 60,
}
