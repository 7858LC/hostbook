"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { formatCurrency, dollarsToCents, centsToDollars } from "@/lib/money";
import { SCHEDULE_E_LINES } from "@/types";
import type { ExpenseRow, PropertyRow } from "@/types";

function ExpenseModal({
  open,
  onClose,
  onSaved,
  initial,
  properties,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (e: ExpenseRow) => void;
  initial?: ExpenseRow | null;
  properties: PropertyRow[];
}) {
  const [form, setForm] = useState({
    property_id: "",
    date: new Date().toISOString().split("T")[0],
    category: "Cleaning & maintenance",
    schedule_e_line: "Cleaning & maintenance",
    description: "",
    amount: "",
    tax_deductible: "yes",
    receipt_url: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initial) {
      setForm({
        property_id: initial.property_id,
        date: initial.date,
        category: initial.category,
        schedule_e_line: initial.schedule_e_line,
        description: initial.description,
        amount: String(centsToDollars(initial.amount)),
        tax_deductible: initial.tax_deductible,
        receipt_url: initial.receipt_url,
        notes: initial.notes,
      });
    } else {
      setForm({
        property_id: properties[0]?.id ?? "",
        date: new Date().toISOString().split("T")[0],
        category: "Cleaning & maintenance",
        schedule_e_line: "Cleaning & maintenance",
        description: "",
        amount: "",
        tax_deductible: "yes",
        receipt_url: "",
        notes: "",
      });
    }
    setError("");
  }, [initial, open, properties]);

  // Keep schedule_e_line in sync with category
  function setCategory(val: string) {
    setForm(f => ({ ...f, category: val, schedule_e_line: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.property_id) { setError("Select a property"); return; }
    if (!form.date) { setError("Date is required"); return; }
    if (!form.description.trim()) { setError("Description is required"); return; }
    if (!form.amount) { setError("Amount is required"); return; }

    const property = properties.find(p => p.id === form.property_id);
    setLoading(true);
    try {
      const method = initial ? "PUT" : "POST";
      const body = {
        ...(initial ? { id: initial.id } : {}),
        property_id: form.property_id,
        property_name: property?.name ?? "",
        date: form.date,
        category: form.category,
        schedule_e_line: form.schedule_e_line,
        description: form.description.trim(),
        amount: dollarsToCents(parseFloat(form.amount) || 0),
        tax_deductible: form.tax_deductible,
        receipt_url: form.receipt_url,
        notes: form.notes,
      };
      const res = await fetch("/api/sheets/expenses", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json() as { data?: ExpenseRow; error?: string };
      if (!res.ok || json.error) { setError(json.error ?? "Failed to save"); return; }
      onSaved(json.data!);
      onClose();
    } finally { setLoading(false); }
  }

  const field = <K extends keyof typeof form>(key: K) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value })),
  });

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit Expense" : "Add Expense"}>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Select label="Property *" {...field("property_id")}>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Input label="Date *" type="date" {...field("date")} />
        </div>

        {/* Schedule E category */}
        <div>
          <label className="block text-xs font-medium text-[#a3a3a3] mb-1">Schedule E Category *</label>
          <select
            value={form.category}
            onChange={e => setCategory(e.target.value)}
            className="w-full bg-[#111] border border-[#2a2a2a] text-[#f5f5f5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ocean"
          >
            {SCHEDULE_E_LINES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <Input label="Description *" placeholder="Deep clean after checkout, new mattress…" {...field("description")} autoFocus={!initial} />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Amount *" type="number" min="0" step="0.01" prefix="$" placeholder="150.00" {...field("amount")} />
          <Select label="Tax Deductible" {...field("tax_deductible")}>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </Select>
        </div>

        <Input label="Receipt URL" type="url" placeholder="https://…" {...field("receipt_url")} />
        <Input label="Notes" placeholder="Optional notes…" {...field("notes")} />

        {error && <p className="text-loss text-sm">{error}</p>}
        <div className="flex gap-3 pt-1 pb-1">
          <Button type="button" variant="secondary" onClick={onClose} fullWidth>Cancel</Button>
          <Button type="submit" loading={loading} fullWidth>{initial ? "Save Changes" : "Add Expense"}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [filterProperty, setFilterProperty] = useState("all");
  const [filterDeductible, setFilterDeductible] = useState("all");

  useEffect(() => {
    Promise.all([
      fetch("/api/sheets/expenses").then(r => r.json() as Promise<{ data: ExpenseRow[] }>),
      fetch("/api/sheets/properties").then(r => r.json() as Promise<{ data: PropertyRow[] }>),
    ]).then(([ej, pj]) => {
      setExpenses(ej.data ?? []);
      setProperties(pj.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  function handleSaved(e: ExpenseRow) {
    setExpenses(prev => {
      const idx = prev.findIndex(x => x.id === e.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = e; return next; }
      return [e, ...prev];
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    const res = await fetch("/api/sheets/expenses", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (res.ok) setExpenses(prev => prev.filter(e => e.id !== id));
  }

  const filtered = expenses.filter(e => {
    if (filterProperty !== "all" && e.property_id !== filterProperty) return false;
    if (filterDeductible !== "all" && e.tax_deductible !== filterDeductible) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));

  const totalAmount = filtered.reduce((s, e) => s + e.amount, 0);
  const deductibleAmount = filtered.filter(e => e.tax_deductible === "yes").reduce((s, e) => s + e.amount, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5]">Expenses</h1>
          <p className="text-sm text-[#525252] mt-0.5">{filtered.length} expense{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }} size="md">+ Add Expense</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          value={filterProperty}
          onChange={e => setFilterProperty(e.target.value)}
          className="text-sm bg-[#1a1a1a] border border-[#2a2a2a] text-[#f5f5f5] rounded-lg px-3 py-2 focus:outline-none focus:border-ocean"
        >
          <option value="all">All Properties</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          value={filterDeductible}
          onChange={e => setFilterDeductible(e.target.value)}
          className="text-sm bg-[#1a1a1a] border border-[#2a2a2a] text-[#f5f5f5] rounded-lg px-3 py-2 focus:outline-none focus:border-ocean"
        >
          <option value="all">All Expenses</option>
          <option value="yes">Deductible Only</option>
          <option value="no">Non-Deductible</option>
        </select>
      </div>

      {loading ? <TableSkeleton /> : filtered.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-4xl mb-3">💳</p>
            <p className="text-[#f5f5f5] font-semibold mb-1">No expenses yet</p>
            <p className="text-sm text-[#525252] mb-4">Track your rental expenses to maximize tax deductions.</p>
            <Button onClick={() => { setEditing(null); setModalOpen(true); }}>Add Your First Expense</Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Totals */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3">
              <p className="text-xs text-[#525252] mb-1">Total</p>
              <p className="font-semibold text-loss text-sm">{formatCurrency(totalAmount)}</p>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3">
              <p className="text-xs text-[#525252] mb-1">Tax Deductible</p>
              <p className="font-semibold text-profit text-sm">{formatCurrency(deductibleAmount)}</p>
            </div>
          </div>

          <div className="space-y-2">
            {filtered.map(e => (
              <Card key={e.id} padding="md">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-[#f5f5f5] text-sm truncate">{e.description}</span>
                      {e.tax_deductible === "yes" && <Badge variant="profit">Deductible</Badge>}
                    </div>
                    <p className="text-xs text-[#a3a3a3] mb-1">
                      {e.property_name} · {e.date}
                    </p>
                    <p className="text-xs text-[#525252]">{e.schedule_e_line}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-loss text-sm mb-2">{formatCurrency(e.amount)}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditing(e); setModalOpen(true); }}
                        className="text-xs text-[#525252] hover:text-[#a3a3a3] transition-colors"
                      >Edit</button>
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="text-xs text-[#525252] hover:text-loss transition-colors"
                      >Delete</button>
                    </div>
                  </div>
                </div>
                {e.receipt_url && (
                  <p className="text-xs mt-2 border-t border-[#2a2a2a] pt-2">
                    <a href={e.receipt_url} target="_blank" rel="noopener noreferrer" className="text-ocean hover:underline">View receipt →</a>
                  </p>
                )}
                {e.notes && <p className="text-xs text-[#525252] mt-1">{e.notes}</p>}
              </Card>
            ))}
          </div>
        </>
      )}

      <ExpenseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        initial={editing}
        properties={properties}
      />
    </div>
  );
}
