"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatCurrencyCompact, formatPercent } from "@/lib/money";
import {
  startOfMonth, endOfMonth, startOfYear, startOfQuarter, endOfQuarter,
  parseISO, isWithinInterval, differenceInDays, format,
} from "date-fns";
import type { BookingRow, ExpenseRow, DashboardMetrics, RecentActivity } from "@/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

// ---------------------------------------------------------------------------
// Metrics calculation
// ---------------------------------------------------------------------------
function computeMetrics(
  bookings: BookingRow[],
  expenses: ExpenseRow[],
  taxRate: number
): { metrics: DashboardMetrics; recent: RecentActivity[]; monthlyChart: { month: string; revenue: number }[] } {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const yearStart = startOfYear(now);
  const qStart = startOfQuarter(now);
  const qEnd = endOfQuarter(now);

  const completed = bookings.filter(b => b.status === "completed" || b.status === "confirmed");

  // Monthly revenue
  const monthlyRevenue = completed
    .filter(b => isWithinInterval(parseISO(b.check_in), { start: monthStart, end: monthEnd }))
    .reduce((s, b) => s + b.net_revenue, 0);

  // YTD revenue & expenses
  const ytdRevenue = completed
    .filter(b => parseISO(b.check_in) >= yearStart)
    .reduce((s, b) => s + b.net_revenue, 0);

  const ytdExpenses = expenses
    .filter(e => e.tax_deductible === "yes" && parseISO(e.date) >= yearStart)
    .reduce((s, e) => s + e.amount, 0);

  const netIncomeYtd = ytdRevenue - ytdExpenses;

  // Occupancy: booked nights this month / days in month
  const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
  const bookedNightsThisMonth = completed
    .filter(b => isWithinInterval(parseISO(b.check_in), { start: monthStart, end: monthEnd }))
    .reduce((s, b) => s + b.nights, 0);
  const occupancyRate = daysInMonth > 0 ? Math.min(100, (bookedNightsThisMonth / daysInMonth) * 100) : 0;

  // RevPAR = YTD net revenue / days since year start
  const daysSinceYearStart = Math.max(1, differenceInDays(now, yearStart));
  const revpar = ytdRevenue > 0 ? Math.round(ytdRevenue / daysSinceYearStart) : 0;

  // Active properties (unique property IDs with at least one booking)
  const activeProperties = new Set(bookings.map(b => b.property_id)).size;

  // Quarterly tax estimate
  const qRevenue = completed
    .filter(b => isWithinInterval(parseISO(b.check_in), { start: qStart, end: qEnd }))
    .reduce((s, b) => s + b.net_revenue, 0);
  const qDeductible = expenses
    .filter(e => e.tax_deductible === "yes" && isWithinInterval(parseISO(e.date), { start: qStart, end: qEnd }))
    .reduce((s, e) => s + e.amount, 0);
  const qTaxable = Math.max(0, qRevenue - qDeductible);
  const quarterlyTax = Math.round((qTaxable * taxRate) / 100);

  // Last 6 months chart
  const monthlyChart = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const mStart = startOfMonth(d);
    const mEnd = endOfMonth(d);
    const revenue = completed
      .filter(b => isWithinInterval(parseISO(b.check_in), { start: mStart, end: mEnd }))
      .reduce((s, b) => s + b.net_revenue, 0);
    return { month: format(d, "MMM"), revenue };
  });

  // Recent activity
  const recentBookings: RecentActivity[] = completed.slice(-5).map(b => ({
    id: b.id, type: "booking" as const, date: b.check_in,
    description: `${b.property_name} · ${b.nights} night${b.nights !== 1 ? "s" : ""}`,
    amount: b.net_revenue, property_name: b.property_name, platform: b.platform,
  }));
  const recentExpenses: RecentActivity[] = expenses.slice(-5).map(e => ({
    id: e.id, type: "expense" as const, date: e.date,
    description: e.description, amount: -e.amount, property_name: e.property_name,
  }));
  const recent = [...recentBookings, ...recentExpenses]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);

  return {
    metrics: {
      monthly_revenue: monthlyRevenue,
      ytd_revenue: ytdRevenue,
      occupancy_rate: occupancyRate,
      revpar,
      active_properties: activeProperties,
      quarterly_tax_estimate: quarterlyTax,
      total_expenses_ytd: ytdExpenses,
      net_income_ytd: netIncomeYtd,
    },
    recent,
    monthlyChart,
  };
}

// ---------------------------------------------------------------------------
// Metric Card
// ---------------------------------------------------------------------------
function MetricCard({ title, value, sub, accent = "neutral" }: { title: string; value: string; sub?: string; accent?: "profit" | "loss" | "ocean" | "warning" | "neutral" }) {
  const colorMap = { profit: "text-profit", loss: "text-loss", ocean: "text-ocean", warning: "text-warning", neutral: "text-[#f5f5f5]" };
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4">
      <p className="text-xs text-[#525252] mb-1 font-medium">{title}</p>
      <p className={`text-2xl font-bold ${colorMap[accent]}`}>{value}</p>
      {sub && <p className="text-xs text-[#525252] mt-0.5">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard page
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [taxRate, setTaxRate] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [bRes, eRes, stRes] = await Promise.all([
          fetch("/api/sheets/bookings"),
          fetch("/api/sheets/expenses"),
          fetch("/api/sheets/settings"),
        ]);
        if (!bRes.ok || !eRes.ok || !stRes.ok) { setError("Failed to load dashboard data"); return; }
        const [bJson, eJson, stJson] = await Promise.all([
          bRes.json() as Promise<{ data: BookingRow[] }>,
          eRes.json() as Promise<{ data: ExpenseRow[] }>,
          stRes.json() as Promise<{ data: { tax_rate: number } }>,
        ]);
        setBookings(bJson.data ?? []);
        setExpenses(eJson.data ?? []);
        setTaxRate(stJson.data?.tax_rate ?? 25);
      } catch { setError("Failed to load dashboard data"); }
      finally { setLoading(false); }
    }
    void load();
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (error) return <div className="px-4 md:px-6 py-6"><p className="text-loss text-sm">{error}</p></div>;

  const { metrics, recent, monthlyChart } = computeMetrics(bookings, expenses, taxRate);
  const currentMonth = new Date().toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#f5f5f5]">Dashboard</h1>
        <p className="text-sm text-[#525252] mt-0.5">{currentMonth}</p>
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <MetricCard title="This Month" value={formatCurrencyCompact(metrics.monthly_revenue)} sub="Net rental income" accent={metrics.monthly_revenue >= 0 ? "profit" : "loss"} />
        <MetricCard title="YTD Net Income" value={formatCurrencyCompact(metrics.net_income_ytd)} sub="Revenue minus expenses" accent={metrics.net_income_ytd >= 0 ? "profit" : "loss"} />
        <MetricCard title="Occupancy" value={formatPercent(metrics.occupancy_rate)} sub="This month" accent="ocean" />
        <MetricCard title="RevPAR" value={formatCurrencyCompact(metrics.revpar)} sub="Revenue / available night" accent="ocean" />
        <MetricCard title="Properties" value={String(metrics.active_properties)} sub="With bookings" accent="neutral" />
        <MetricCard title="Q Tax Estimate" value={formatCurrencyCompact(metrics.quarterly_tax_estimate)} sub={`At ${taxRate}% rate`} accent={metrics.quarterly_tax_estimate > 0 ? "warning" : "neutral"} />
      </div>

      {/* Revenue chart */}
      <Card padding="md">
        <h2 className="font-semibold text-[#f5f5f5] mb-1">Net Revenue — Last 6 Months</h2>
        <p className="text-xs text-[#525252] mb-4">After platform fees</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={monthlyChart} barSize={28}>
            <XAxis dataKey="month" tick={{ fill: "#525252", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              formatter={(v: number) => [formatCurrency(v), "Net revenue"]}
              contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, fontSize: 12 }}
              cursor={{ fill: "rgba(14,165,233,0.05)" }}
            />
            <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
              {monthlyChart.map((entry, i) => (
                <Cell key={i} fill={entry.revenue >= 0 ? "#0ea5e9" : "#ef4444"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Recent activity */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[#f5f5f5]">Recent Activity</h2>
          <a href="/bookings" className="text-xs text-[#a3a3a3] hover:text-ocean transition-colors">View all →</a>
        </div>
        {recent.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[#525252] text-sm">No activity yet.</p>
            <p className="text-xs text-[#525252] mt-1">Add a property and log your first booking to get started.</p>
            <a href="/properties" className="inline-block mt-4 bg-ocean text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-sky-600 transition-colors">Add Property →</a>
          </div>
        ) : (
          <div className="space-y-1">
            {recent.map(item => (
              <div key={item.id} className="flex items-center gap-3 py-2.5 border-b border-[#2a2a2a] last:border-0">
                <span className="text-lg">{item.type === "booking" ? "📅" : "💳"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#f5f5f5] truncate">{item.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-[#525252]">{item.date}</p>
                    {item.platform && <Badge variant="ocean">{item.platform}</Badge>}
                  </div>
                </div>
                <span className={`text-sm font-semibold shrink-0 ${item.amount >= 0 ? "text-profit" : "text-loss"}`}>
                  {item.amount >= 0 ? "+" : ""}{formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Schedule E summary */}
      <Card padding="md">
        <h2 className="font-semibold text-[#f5f5f5] mb-1">YTD Summary</h2>
        <p className="text-xs text-[#525252] mb-4">For your Schedule E</p>
        <div className="space-y-2">
          {[
            { label: "Gross Rental Income", value: metrics.ytd_revenue, accent: "text-profit" },
            { label: "Deductible Expenses", value: -metrics.total_expenses_ytd, accent: "text-loss" },
            { label: "Net Income", value: metrics.net_income_ytd, accent: metrics.net_income_ytd >= 0 ? "text-profit" : "text-loss" },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-[#2a2a2a] last:border-0">
              <span className="text-sm text-[#a3a3a3]">{row.label}</span>
              <span className={`text-sm font-semibold ${row.accent}`}>{formatCurrency(Math.abs(row.value))}</span>
            </div>
          ))}
        </div>
        <a href="/reports" className="mt-4 inline-block text-xs text-ocean hover:underline">Full Schedule E report →</a>
      </Card>
    </div>
  );
}
