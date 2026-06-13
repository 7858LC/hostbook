export type Platform = "linkedin" | "reddit" | "google" | "twitter" | "facebook"

export interface ICP {
  id: string
  name: string
  description: string
  who: { industries: string[]; jobTitles: string[]; companySizes: string[]; locations: string[] }
  what: { problemsTheyFace: string[]; solutionsTheySeek: string[]; currentAlternatives: string[]; keyPurchaseCriteria: string[] }
  why: { primaryMotivations: string[]; painPoints: string[]; desiredOutcomes: string[]; emotionalDrivers: string[] }
  when: { purchaseTriggers: string[]; buyingCycle: "immediate" | "1-4 weeks" | "1-3 months" | "3-12 months"; urgencySignals: string[] }
  where: { platforms: Platform[]; subreddits?: string[]; keywords: string[]; searchQueries: string[] }
  how: { decisionProcess: string[]; influencers: string[]; outreachTone: "formal" | "casual" | "technical" | "friendly"; preferredChannels: string[] }
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: string
  name: string
  type: "product" | "service"
  description: string
  valueProposition: string
  keyBenefits: string[]
  targetICPIds: string[]
  pricing: { model: "free" | "one-time" | "subscription" | "usage-based" | "custom"; startingAt?: string }
  uniqueSellingPoints: string[]
  targetProblems: string[]
  createdAt: string
}

export interface Campaign {
  id: string
  name: string
  icpId: string
  productId: string
  status: "draft" | "active" | "paused" | "completed"
  platforms: Platform[]
  customQueries: string[]
  settings: {
    autoApproveThreshold: number
    dailyLimit: number
    messagingStyle: "formal" | "casual" | "technical" | "friendly"
  }
  stats: { discovered: number; vetted: number; approved: number; messaged: number; responded: number; converted: number }
  createdAt: string
  lastRunAt?: string
}

export type LeadStatus = "new" | "analyzing" | "vetted" | "rejected" | "approved" | "messaged" | "responded" | "converted"

export interface Lead {
  id: string
  campaignId: string
  discoveredAt: string
  platform: Platform
  sourceUrl: string
  searchQuery: string
  name?: string
  title?: string
  company?: string
  bio?: string
  profileUrl?: string
  signalText: string
  signalContext: string
  icpScore?: number
  buyingIntent?: "high" | "medium" | "low"
  matchReasons?: string[]
  riskFactors?: string[]
  estimatedStage?: "awareness" | "consideration" | "decision"
  analysisNotes?: string
  matchedProductId?: string
  generatedMessage?: string
  messagePersonalizationNotes?: string
  status: LeadStatus
  sentAt?: string
  sentChannel?: string
  responseReceived?: boolean
  updatedAt: string
}

export interface ScanResult {
  url: string
  title: string
  snippet: string
  platform: Platform
  metadata?: { author?: string; subreddit?: string; upvotes?: number; title?: string; company?: string }
}

export interface AnalysisResult {
  leadId: string
  icpScore: number
  buyingIntent: "high" | "medium" | "low"
  matchReasons: string[]
  riskFactors: string[]
  estimatedStage: "awareness" | "consideration" | "decision"
  analysisNotes: string
  pass: boolean
}

export interface MessageResult {
  leadId: string
  message: string
  personalizationNotes: string
  channel: string
}

export interface ICNStore {
  icps: ICP[]
  products: Product[]
  campaigns: Campaign[]
  leads: Lead[]
}
