export type TradeType = "hvac" | "plumbing" | "electrical" | "roofing" | "general"
export type Urgency = "emergency" | "urgent" | "planned" | "unknown"
export type LeadStatus =
  | "raw"
  | "qualified"
  | "outreach_sent"
  | "intake_received"
  | "available"
  | "notified"
  | "claimed"
  | "rejected"
  | "expired"

export interface TradesLead {
  id: string
  discoveredAt: string
  platform: "reddit" | "hackernews" | "facebook" | "nextdoor" | "google" | "other"
  groupName?: string
  sourceUrl: string
  rawText: string
  authorHandle?: string
  tradeType: TradeType | "unknown"
  urgency: Urgency
  location?: string
  locationState?: string
  problemSummary: string
  qualityScore: number
  estimatedValue: number
  status: LeadStatus
  // Outreach + intake
  outreachSentAt?: string
  homeownerName?: string
  homeownerPhone?: string
  // Cascade
  cascadePosition?: number
  cascadeBuyerIds?: string[]
  cascadeNotifiedAt?: string
  // Claim
  claimedBy?: string
  claimedAt?: string
  stripeSessionId?: string
  notifiedAt?: string
}

export interface Buyer {
  id: string
  businessName: string
  contactName: string
  email: string
  phone?: string
  serviceTypes: TradeType[]
  coverageZips: string[]
  coverageState?: string
  active: boolean
  totalLeadsClaimed: number
  createdAt: string
}
