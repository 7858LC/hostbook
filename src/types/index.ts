// ---------------------------------------------------------------------------
// Core domain types
// ---------------------------------------------------------------------------

export interface PropertyRow {
  id: string;
  name: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  nightly_rate: number; // cents — base/default nightly rate
  active: "yes" | "no";
  notes: string;
}

export interface BookingRow {
  id: string;
  property_id: string;
  property_name: string;
  check_in: string;   // YYYY-MM-DD
  check_out: string;  // YYYY-MM-DD
  nights: number;
  guests: number;
  platform: string;
  gross_revenue: number;   // cents — total guest paid (incl. cleaning fee)
  cleaning_fee: number;    // cents — cleaning fee collected
  platform_fee: number;    // cents — exact fee charged by platform
  net_revenue: number;     // cents — gross_revenue - platform_fee
  status: "confirmed" | "completed" | "cancelled";
  notes: string;
}

export interface ExpenseRow {
  id: string;
  property_id: string;
  property_name: string;
  date: string;
  category: string;
  schedule_e_line: ScheduleELine;
  description: string;
  amount: number;          // cents
  tax_deductible: "yes" | "no";
  receipt_url: string;
  notes: string;
}

export interface Settings {
  business_name: string;
  state: string;
  tax_rate: number;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  subscription_status: string;
  trial_end_date: string;
  spreadsheet_id: string;
}

// ---------------------------------------------------------------------------
// IRS Schedule E line items (Part I — rental income/loss)
// These map directly to lines on Schedule E for residential rentals.
// ---------------------------------------------------------------------------
export const SCHEDULE_E_LINES = [
  "Advertising",
  "Auto & travel",
  "Cleaning & maintenance",
  "Commissions (platform fees)",
  "Insurance",
  "Legal & professional fees",
  "Management fees",
  "Mortgage interest",
  "Other interest",
  "Repairs",
  "Supplies",
  "Taxes & licenses",
  "Utilities",
  "Other",
] as const;

export type ScheduleELine = (typeof SCHEDULE_E_LINES)[number];

// ---------------------------------------------------------------------------
// STR platforms
// ---------------------------------------------------------------------------
export const STR_PLATFORMS = [
  "Airbnb",
  "VRBO",
  "Booking.com",
  "Furnished Finder",
  "Hipcamp",
  "Direct",
  "Facebook Marketplace",
  "Other",
] as const;

export type STRPlatform = (typeof STR_PLATFORMS)[number];

// ---------------------------------------------------------------------------
// Dashboard types
// ---------------------------------------------------------------------------
export interface DashboardMetrics {
  monthly_revenue: number;
  ytd_revenue: number;
  occupancy_rate: number;         // 0–100 percentage for current month
  revpar: number;                 // revenue per available night (YTD)
  active_properties: number;
  quarterly_tax_estimate: number;
  total_expenses_ytd: number;
  net_income_ytd: number;
}

export interface RecentActivity {
  id: string;
  type: "booking" | "expense";
  date: string;
  description: string;
  amount: number;
  property_name: string;
  platform?: string;
}

export interface QuarterData {
  quarter: number;
  year: number;
  gross_revenue: number;
  deductible_expenses: number;
  estimated_taxable_income: number;
  estimated_tax_owed: number;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
export interface ApiError {
  error: string;
}
