"use client";
import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { formatCurrency } from "@/lib/money";
import { SCHEDULE_E_LINES } from "@/types";
import type { BookingRow, ExpenseRow, PropertyRow } from "@/types";
import { startOfYear, endOfYear, startOfMonth, endOfMonth, parseISO, isWithinInterval, format } from "date-fns";

type Period = "ytd" | "this_month" | "last_month" | "this_year";

function parsePeriod(period: Period): { start: Date; end: Date; label: string } {
  const now = new Date();
  switch (period) {
    case "ytd":       return { start: startOfYear(now), end: now, label: `YTD ${now.getFullYear()}` };
    case "this_month": return { start: startOfMonth(now), end: endOfMonth(now), label: format(now, "MMMM yyyy") };
    case "last_month": {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { start: startOfMonth(lm), end: endOfMonth(lm), label: format(lm, "MMMM yyyy") };
    }
    case "this_year":  return { start: startOfYear(now), end: endOfYear(now), label: `Full Year ${now.getFullYear()}` };
  }
}

export default function ReportsPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("ytd");
  const [view, setView] = useState<"schedule_e" | "per_property">("schedule_e");

  useEffect(() => {
    Promise.all([
      fetch("/api/sheets/bookings").then(r => r.json() as Promise<{ data: BookingRow[] }>),
      fetch("/api/sheets/expenses").then(r => r.json() as Promise<{ data: ExpenseRow[] }>),
      fetch("/api/sheets/properties").then(r => r.json() as Promise<{ data: PropertyRow[] }>),
    ]).then(([bj, ej, pj]) => {
      setBookings(bj.data ?? []);
      setExpenses(ej.data ?? []);
      setProperties(pj.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const { start, end, label } = parsePeriod(period);

  const filteredBookings = useMemo(
    () => bookings.filter(b =>
      (b.status === "completed" || b.status === "confirmed") &&
      isWithinInterval(parseISO(b.check_in), { start, end })
    ),
    [bookings, start, end]
  );

  const filteredExpenses = useMemo(
    () => expenses.filter(e => isWithinInterval(parseISO(e.date), { start, end })),
    [expenses, start, end]
  );

  // Schedule E summary
  const scheduleE = useMemo(() => {
    const grossRevenue = filteredBookings.reduce((s, b) => s + b.net_revenue, 0);
    const byLine = Object.fromEntries(SCHEDULE_E_LINES.map(l => [l, 0])) as Record<string, number>;
    let totalDeductible = 0;
    for (const e of filteredExpenses) {
      if (e.tax_deductible === "yes") {
        byLine[e.schedule_e_line] = (byLine[e.schedule_e_line] ?? 0) + e.amount;
        totalDeductible += e.amount;
      }
    }
    return { grossRevenue, byLine, totalDeductible, net: grossRevenue - totalDeductible };
  }, [filteredBookings, filteredExpenses]);

  // Per-property P&L
  const perProperty = useMemo(() => {
    return properties.map(prop => {
      const propBookings = filteredBookings.filter(b => b.property_id === prop.id);
      const propExpenses = filteredExpenses.filter(e => e.property_id === prop.id && e.tax_deductible === "yes");
      const revenue = propBookings.reduce((s, b) => s + b.net_revenue, 0);
      const expenseTotal = propExpenses.reduce((s, e) => s + e.amount, 0);
      const nights = propBookings.reduce((s, b) => s + b.nights, 0);
      return { prop, revenue, expenseTotal, net: revenue - expenseTotal, nights, bookings: propBookings.length };
    }).filter(r => r.revenue > 0 || r.expenseTotal > 0);
  }, [properties, filteredBookings, filteredExpenses]);

  function handleExport() {
    const rows = [
      ["HostBook Schedule E Export", label],
      [],
      ["INCOME"],
      ["Gross Rental Income", centsToDollarsStr(scheduleE.grossRevenue)],
      [],
      ["EXPENSES"],
      ...SCHEDULE_E_LINES
        .filter(l => scheduleE.byLine[l] > 0)
        .map(l => [l, centsToDollarsStr(scheduleE.byLine[l])]),
      ["Total Deductible Expenses", centsToDollarsStr(scheduleE.totalDeductible)],
      [],
      ["NET INCOME", centsToDollarsStr(scheduleE.net)],
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hostbook-schedule-e-${label.replace(/\s/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5]">Reports</h1>
          <p className="text-sm text-[#525252] mt-0.5">{label}</p>
        </div>
        <Button variant="secondary" onClick={handleExport} size="md">↓ Export CSV</Button>
      </div>

      {/* Controls */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {/* Period selector */}
        <div className="flex bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-0.5 gap-0.5">
          {(["ytd", "this_month", "last_month", "this_year"] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${period === p ? "bg-ocean text-white font-semibold" : "text-[#525252] hover:text-[#a3a3a3]"}`}
            >
              {p === "ytd" ? "YTD" : p === "this_month" ? "This Month" : p === "last_month" ? "Last Month" : "Full Year"}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-0.5 gap-0.5">
          {(["schedule_e", "per_property"] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${view === v ? "bg-ocean text-white font-semibold" : "text-[#525252] hover:text-[#a3a3a3]"}`}
            >
              {v === "schedule_e" ? "Schedule E" : "Per Property"}
            </button>
          ))}
        </div>
      </div>

      {view === "schedule_e" ? (
        <Card padding="md">
          <h2 className="font-semibold text-[#f5f5f5] mb-1">Schedule E Summary</h2>
          <p className="text-xs text-[#525252] mb-4">IRS Schedule E, Part I — Rental Income and Loss</p>

          {/* Income */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider mb-2">Income</p>
            <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
              <span className="text-sm text-[#f5f5f5]">Gross Rental Income (Line 3)</span>
              <span className="text-sm font-semibold text-profit">{formatCurrency(scheduleE.grossRevenue)}</span>
            </div>
          </div>

          {/* Expenses */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider mb-2">Expenses</p>
            <div className="space-y-0">
              {SCHEDULE_E_LINES.map(line => {
                const amount = scheduleE.byLine[line] ?? 0;
                if (amount === 0) return null;
                return (
                  <div key={line} className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                    <span className="text-sm text-[#a3a3a3]">{line}</span>
                    <span className="text-sm text-loss">{formatCurrency(amount)}</span>
                  </div>
                );
              })}
              {scheduleE.totalDeductible === 0 && (
                <p className="text-xs text-[#525252] py-2">No deductible expenses in this period.</p>
              )}
            </div>
            {scheduleE.totalDeductible > 0 && (
              <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a] font-semibold">
                <span className="text-sm text-[#f5f5f5]">Total Expenses</span>
                <span className="text-sm text-loss">{formatCurrency(scheduleE.totalDeductible)}</span>
              </div>
            )}
          </div>

          {/* Net */}
          <div className="flex justify-between items-center py-3 bg-[#111] rounded-xl px-3 mt-2">
            <span className="text-sm font-bold text-[#f5f5f5]">Net Income / (Loss)</span>
            <span className={`text-sm font-bold ${scheduleE.net >= 0 ? "text-profit" : "text-loss"}`}>
              {formatCurrency(scheduleE.net)}
            </span>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {perProperty.length === 0 ? (
            <Card>
              <div className="text-center py-10">
                <p className="text-[#525252] text-sm">No data for this period.</p>
              </div>
            </Card>
          ) : perProperty.map(({ prop, revenue, expenseTotal, net, nights, bookings: bCount }) => (
            <Card key={prop.id} padding="md">
              <h3 className="font-semibold text-[#f5f5f5] mb-3">{prop.name}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                {[
                  { label: "Net Revenue", value: formatCurrency(revenue), color: "text-profit" },
                  { label: "Expenses", value: formatCurrency(expenseTotal), color: "text-loss" },
                  { label: "Nights", value: String(nights), color: "text-[#f5f5f5]" },
                  { label: "Bookings", value: String(bCount), color: "text-[#f5f5f5]" },
                ].map(m => (
                  <div key={m.label} className="bg-[#111] rounded-lg p-2.5">
                    <p className="text-xs text-[#525252] mb-0.5">{m.label}</p>
                    <p className={`text-sm font-semibold ${m.color}`}>{m.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[#2a2a2a]">
                <span className="text-sm text-[#a3a3a3]">Net Income</span>
                <span className={`text-sm font-bold ${net >= 0 ? "text-profit" : "text-loss"}`}>{formatCurrency(net)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function centsToDollarsStr(cents: number): string {
  return (cents / 100).toFixed(2);
}
