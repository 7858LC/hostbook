// Ideal Customer Navigator — type definitions

export type Platform = 'linkedin' | 'reddit' | 'google' | 'twitter' | 'facebook'

// ---------------------------------------------------------------------------
// Ideal Customer Profile — 5W + 1H framework
// ---------------------------------------------------------------------------
export interface ICP {
  id: string
  name: string
  description: string

  // WHO they are
  who: {
    industries: string[]
    jobTitles: string[]
    companySizes: string[]
    locations: string[]
    ageRange?: string
    incomeRange?: string
    techSavviness?: 'low' | 'medium' | 'high'
  }

  // WHAT they buy / need
  what: {
    problemsTheyFace: string[]
    solutionsTheySeek: string[]
    currentAlternatives: string[]
    keyPurchaseCriteria: string[]
  }

  // WHY they buy
  why: {
    primaryMotivations: string[]
    painPoints: string[]
    desiredOutcomes: string[]
    emotionalDrivers: string[]
  }

  // WHEN they buy
  when: {
    purchaseTriggers: string[]
    buyingCycle: 'immediate' | '1-4 weeks' | '1-3 months' | '3-12 months'
    urgencySignals: string[]
    seasonality?: string
  }

  // WHERE to find them
  where: {
    platforms: Platform[]
    subreddits?: string[]
    keywords: string[]
    hashtags?: string[]
    communities?: string[]
    searchQueries: string[]
  }

  // HOW they buy
  how: {
    decisionProcess: string[]
    influencers: string[]
    contentPreferences: string[]
    outreachTone: 'formal' | 'casual' | 'technical' | 'friendly'
    preferredChannels: string[]
  }

  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Product / Service
// ---------------------------------------------------------------------------
export interface Product {
  id: string
  name: string
  type: 'product' | 'service'
  description: string
  valueProposition: string
  keyBenefits: string[]
  targetICPIds: string[]
  pricing: {
    model: 'free' | 'one-time' | 'subscription' | 'usage-based' | 'custom'
    range?: string
    startingAt?: string
  }
  uniqueSellingPoints: string[]
  targetProblems: string[]
  createdAt: string
}

// ---------------------------------------------------------------------------
// Campaign
// ---------------------------------------------------------------------------
export interface Campaign {
  id: string
  name: string
  icpId: string
  productId: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  platforms: Platform[]
  customQueries: string[]
  settings: {
    autoApproveThreshold?: number
    dailyLimit: number
    messagingStyle: 'formal' | 'casual' | 'technical' | 'friendly'
    includeIntroduction: boolean
    includeCTA: boolean
  }
  stats: {
    discovered: number
    analyzed: number
    vetted: number
    approved: number
    messaged: number
    responded: number
    converted: number
  }
  createdAt: string
  lastRunAt?: string
}

// ---------------------------------------------------------------------------
// Lead
// ---------------------------------------------------------------------------
export type LeadStatus =
  | 'new'
  | 'analyzing'
  | 'vetted'
  | 'rejected'
  | 'approved'
  | 'messaging'
  | 'messaged'
  | 'responded'
  | 'converted'

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
  location?: string
  bio?: string
  email?: string
  profileUrl?: string

  signalText: string
  signalContext: string

  icpScore?: number
  buyingIntent?: 'high' | 'medium' | 'low'
  matchedICPId?: string
  matchedProductId?: string
  analysisNotes?: string
  matchReasons?: string[]
  riskFactors?: string[]
  estimatedStage?: 'awareness' | 'consideration' | 'decision'

  generatedMessage?: string
  messagePersonalizationNotes?: string

  status: LeadStatus
  approvedAt?: string
  rejectedReason?: string

  sentMessage?: string
  sentAt?: string
  sentChannel?: string
  responseReceived?: boolean
  responseAt?: string
  responseNotes?: string

  updatedAt: string
}

// ---------------------------------------------------------------------------
// Scanning
// ---------------------------------------------------------------------------
export interface ScanResult {
  url: string
  title: string
  snippet: string
  platform: Platform
  metadata?: {
    author?: string
    subreddit?: string
    upvotes?: number
    date?: string
    profileUrl?: string
    company?: string
    title?: string
  }
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------
export interface AnalysisResult {
  leadId: string
  icpScore: number
  buyingIntent: 'high' | 'medium' | 'low'
  matchReasons: string[]
  riskFactors: string[]
  estimatedStage: 'awareness' | 'consideration' | 'decision'
  analysisNotes: string
  pass: boolean
}

export interface MessageResult {
  leadId: string
  message: string
  personalizationNotes: string
  channel: string
}

export interface NavigatorStats {
  totalICPs: number
  totalProducts: number
  activeCampaigns: number
  totalLeads: number
  leadsByStatus: Partial<Record<LeadStatus, number>>
  topCampaign?: { name: string; messaged: number; responded: number }
}
