export type TradeType = "hvac" | "plumbing" | "electrical" | "general"
export type Urgency = "emergency" | "urgent" | "planned" | "unknown"
export type LeadStatus = "raw" | "qualified" | "available" | "notified" | "claimed" | "rejected"

export interface TradesLead {
  id: string
  discoveredAt: string
  platform: "reddit" | "hackernews" | "google" | "other"
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
