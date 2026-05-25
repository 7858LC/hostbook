"use client";
import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { formatCurrency, formatPercent } from "@/lib/money";
import { SCHEDULE_E_LINES } from "@/types";
import type { BookingRow, ExpenseRow } from "@/types";
import {
  startOfQuarter, endOfQuarter, startOfYear,
  parseISO, isWithinInterval, format, subQuarters,
} from "date-fns";

interface QuarterSummary {
  label: string;
  grossRevenue: number;
  deductibleExpenses: number;
  taxableIncome: number;
  estimatedTax: number;
  isPast: boolean;
}

export default function TaxPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [taxRate, setTaxRate] = useState(25);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/sheets/bookings").then(r => r.json() as Promise<{ data: BookingRow[] }>),
      fetch("/api/sheets/expenses").then(r => r.json() as Promise<{ data: ExpenseRow[] }>),
      fetch("/api/sheets/settings").then(r => r.json() as Promise<{ data: { tax_rate?: number } }>),
    ]).then(([bj, ej, sj]) => {
      setBookings(bj.data ?? []);
      setExpenses(ej.data ?? []);
      setTaxRate(sj.data?.tax_rate ?? 25);
    }).finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const yearStart = startOfYear(now);

  // Build 4 quarters for the current year
  const quarters: QuarterSummary[] = useMemo(() => {
    const completed = bookings.filter(b => b.status === "completed" || b.status === "confirmed");

    return [0, 1, 2, 3].map(qi => {
      const qStart = startOfQuarter(new Date(now.getFullYear(), qi * 3, 1));
      const qEnd = endOfQuarter(qStart);
      const isPast = qEnd < now;

      const grossRevenue = completed
        .filter(b => isWithinInterval(parseISO(b.check_in), { start: qStart, end: qEnd }))
        .reduce((s, b) => s + b.net_revenue, 0);

      const deductibleExpenses = expenses
        .filter(e => e.tax_deductible === "yes" && isWithinInterval(parseISO(e.date), { start: qStart, end: qEnd }))
        .reduce((s, e) => s + e.amount, 0);

      const taxableIncome = Math.max(0, grossRevenue - deductibleExpenses);
      const estimatedTax = Math.round((taxableIncome * taxRate) / 100);

      return {
        label: `Q${qi + 1} ${now.getFullYear()}`,
        grossRevenue,
        deductibleExpenses,
        taxableIncome,
        estimatedTax,
        isPast,
      };
    });
  }, [bookings, expenses, taxRate, now]);

  // YTD totals
  const ytd = useMemo(() => {
    const completed = bookings.filter(b => b.status === "completed" || b.status === "confirmed");
    const grossRevenue = completed
      .filter(b => parseISO(b.check_in) >= yearStart)
      .reduce((s, b) => s + b.net_revenue, 0);
    const deductibleExpenses = expenses
      .filter(e => e.tax_deductible === "yes" && parseISO(e.date) >= yearStart)
      .reduce((s, e) => s + e.amount, 0);
    const taxableIncome = Math.max(0, grossRevenue - deductibleExpenses);
    const estimatedTax = Math.round((taxableIncome * taxRate) / 100);
    return { grossRevenue, deductibleExpenses, taxableIncome, estimatedTax };
  }, [bookings, expenses, taxRate, yearStart]);

  // Schedule E breakdown YTD
  const scheduleEBreakdown = useMemo(() => {
    const deductible = expenses.filter(e =>
      e.tax_deductible === "yes" && parseISO(e.date) >= yearStart
    );
    return SCHEDULE_E_LINES.map(line => ({
      line,
      amount: deductible.filter(e => e.schedule_e_line === line).reduce((s, e) => s + e.amount, 0),
    })).filter(r => r.amount > 0);
  }, [expenses, yearStart]);

  // IRS quarterly due dates for current year
  const dueDates = [
    { quarter: "Q1", due: `April 15, ${now.getFullYear()}` },
    { quarter: "Q2", due: `June 16, ${now.getFullYear()}` },
    { quarter: "Q3", due: `September 15, ${now.getFullYear()}` },
    { quarter: "Q4", due: `January 15, ${now.getFullYear() + 1}` },
  ];

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#f5f5f5]">Tax Center</h1>
        <p className="text-sm text-[#525252] mt-0.5">Estimated quarterly payments · Schedule E breakdown</p>
      </div>

      {/* Disclaimer */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 mb-6">
        <p className="text-xs text-[#525252]">
          <span className="text-warning font-semibold">Note:</span> These are estimates based on your logged data and the tax rate set in Settings. Consult a tax professional for your actual liability.
        </p>
      </div>

      {/* YTD Summary */}
      <Card padding="md" className="mb-4">
        <h2 className="font-semibold text-[#f5f5f5] mb-1">YTD Summary — {now.getFullYear()}</h2>
        <p className="text-xs text-[#525252] mb-4">At {taxRate}% effective rate</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Gross Revenue", value: formatCurrency(ytd.grossRevenue), color: "text-profit" },
            { label: "Deductions", value: formatCurrency(ytd.deductibleExpenses), color: "text-loss" },
            { label: "Taxable Income", value: formatCurrency(ytd.taxableIncome), color: "text-[#f5f5f5]" },
            { label: "Est. Tax Owed", value: formatCurrency(ytd.estimatedTax), color: "text-warning" },
          ].map(m => (
            <div key={m.label} className="bg-[#111] rounded-xl p-3">
              <p className="text-xs text-[#525252] mb-1">{m.label}</p>
              <p className={`text-sm font-bold ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Quarterly breakdown */}
      <Card padding="md" className="mb-4">
        <h2 className="font-semibold text-[#f5f5f5] mb-4">Quarterly Estimates</h2>
        <div className="space-y-0">
          {quarters.map((q, i) => (
            <div key={q.label} className="flex items-center justify-between py-3 border-b border-[#2a2a2a] last:border-0">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-[#f5f5f5]">{q.label}</span>
                  <span className="text-xs text-[#525252]">due {dueDates[i].due}</span>
                  {q.isPast && q.estimatedTax === 0 && (
                    <span className="text-xs text-profit">✓ No tax</span>
                  )}
                </div>
                <p className="text-xs text-[#525252]">
                  Revenue: {formatCurrency(q.grossRevenue)} · Deductions: {formatCurrency(q.deductibleExpenses)}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${q.estimatedTax > 0 ? "text-warning" : "text-[#525252]"}`}>
                  {formatCurrency(q.estimatedTax)}
                </p>
                <p className="text-xs text-[#525252]">{q.estimatedTax > 0 ? "est. due" : "no payment"}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Schedule E deduction breakdown */}
      {scheduleEBreakdown.length > 0 && (
        <Card padding="md">
          <h2 className="font-semibold text-[#f5f5f5] mb-1">Deduction Breakdown — YTD</h2>
          <p className="text-xs text-[#525252] mb-4">Schedule E, Part I expense lines</p>
          <div className="space-y-0">
            {scheduleEBreakdown.map(({ line, amount }) => (
              <div key={line} className="flex justify-between items-center py-2.5 border-b border-[#2a2a2a] last:border-0">
                <span className="text-sm text-[#a3a3a3]">{line}</span>
                <span className="text-sm font-semibold text-loss">{formatCurrency(amount)}</span>
              </div>
            ))}
            <div className="flex justify-between items-center py-2.5 font-semibold">
              <span className="text-sm text-[#f5f5f5]">Total Deductions</span>
              <span className="text-sm text-loss">{formatCurrency(ytd.deductibleExpenses)}</span>
            </div>
          </div>
          <a href="/reports" className="mt-3 inline-block text-xs text-ocean hover:underline">Full Schedule E report →</a>
        </Card>
      )}
    </div>
  );
}
