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
import { STR_PLATFORMS } from "@/types";
import type { BookingRow, PropertyRow } from "@/types";

const STATUS_OPTIONS = ["confirmed", "completed", "cancelled"] as const;

const STATUS_VARIANT: Record<string, "ocean" | "profit" | "loss" | "neutral"> = {
  confirmed: "ocean",
  completed: "profit",
  cancelled: "loss",
};

function BookingModal({
  open,
  onClose,
  onSaved,
  initial,
  properties,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (b: BookingRow) => void;
  initial?: BookingRow | null;
  properties: PropertyRow[];
}) {
  const [form, setForm] = useState({
    property_id: "",
    check_in: "",
    check_out: "",
    guests: "",
    platform: "Airbnb",
    gross_revenue: "",
    cleaning_fee: "",
    platform_fee: "",
    status: "confirmed",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Derived: nights preview
  const nights = (() => {
    if (!form.check_in || !form.check_out) return 0;
    const diff = (new Date(form.check_out).getTime() - new Date(form.check_in).getTime()) / 86400000;
    return diff > 0 ? diff : 0;
  })();

  // Derived: net revenue preview
  const netPreview = (() => {
    const gross = parseFloat(form.gross_revenue) || 0;
    const fee = parseFloat(form.platform_fee) || 0;
    return gross - fee;
  })();

  useEffect(() => {
    if (initial) {
      setForm({
        property_id: initial.property_id,
        check_in: initial.check_in,
        check_out: initial.check_out,
        guests: String(initial.guests),
        platform: initial.platform,
        gross_revenue: String(centsToDollars(initial.gross_revenue)),
        cleaning_fee: String(centsToDollars(initial.cleaning_fee)),
        platform_fee: String(centsToDollars(initial.platform_fee)),
        status: initial.status,
        notes: initial.notes,
      });
    } else {
      setForm({
        property_id: properties[0]?.id ?? "",
        check_in: "",
        check_out: "",
        guests: "",
        platform: "Airbnb",
        gross_revenue: "",
        cleaning_fee: "",
        platform_fee: "",
        status: "confirmed",
        notes: "",
      });
    }
    setError("");
  }, [initial, open, properties]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.property_id) { setError("Select a property"); return; }
    if (!form.check_in) { setError("Check-in date is required"); return; }
    if (!form.check_out) { setError("Check-out date is required"); return; }
    if (nights <= 0) { setError("Check-out must be after check-in"); return; }
    if (!form.gross_revenue) { setError("Gross revenue is required"); return; }

    const property = properties.find(p => p.id === form.property_id);

    setLoading(true);
    try {
      const method = initial ? "PUT" : "POST";
      const body = {
        ...(initial ? { id: initial.id } : {}),
        property_id: form.property_id,
        property_name: property?.name ?? "",
        check_in: form.check_in,
        check_out: form.check_out,
        guests: parseInt(form.guests) || 1,
        platform: form.platform,
        gross_revenue: dollarsToCents(parseFloat(form.gross_revenue) || 0),
        cleaning_fee: dollarsToCents(parseFloat(form.cleaning_fee) || 0),
        platform_fee: dollarsToCents(parseFloat(form.platform_fee) || 0),
        status: form.status,
        notes: form.notes,
      };
      const res = await fetch("/api/sheets/bookings", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json() as { data?: BookingRow; error?: string };
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
    <Modal open={open} onClose={onClose} title={initial ? "Edit Booking" : "Add Booking"}>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Property */}
        <Select label="Property *" {...field("property_id")}>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Check-in *" type="date" {...field("check_in")} />
          <Input label="Check-out *" type="date" {...field("check_out")} />
        </div>
        {nights > 0 && (
          <p className="text-xs text-[#a3a3a3] -mt-2">
            {nights} night{nights !== 1 ? "s" : ""}
          </p>
        )}

        {/* Guests + Platform */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Guests" type="number" min="1" placeholder="2" {...field("guests")} />
          <Select label="Platform" {...field("platform")}>
            {STR_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
          </Select>
        </div>

        {/* Revenue */}
        <div className="grid grid-cols-3 gap-3">
          <Input label="Gross Revenue *" type="number" min="0" step="0.01" prefix="$" placeholder="500.00" {...field("gross_revenue")} />
          <Input label="Cleaning Fee" type="number" min="0" step="0.01" prefix="$" placeholder="75.00" {...field("cleaning_fee")} />
          <Input label="Platform Fee" type="number" min="0" step="0.01" prefix="$" placeholder="65.00" {...field("platform_fee")} />
        </div>
        {(parseFloat(form.gross_revenue) > 0 || parseFloat(form.platform_fee) > 0) && (
          <p className="text-xs text-[#a3a3a3] -mt-2">
            Net revenue: <span className={netPreview >= 0 ? "text-profit font-medium" : "text-loss font-medium"}>{formatCurrency(dollarsToCents(netPreview))}</span>
          </p>
        )}

        {/* Status */}
        <Select label="Status" {...field("status")}>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </Select>

        <Input label="Notes" placeholder="Optional notes…" {...field("notes")} />

        {error && <p className="text-loss text-sm">{error}</p>}
        <div className="flex gap-3 pt-1 pb-1">
          <Button type="button" variant="secondary" onClick={onClose} fullWidth>Cancel</Button>
          <Button type="submit" loading={loading} fullWidth>{initial ? "Save Changes" : "Add Booking"}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BookingRow | null>(null);
  const [filterProperty, setFilterProperty] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    Promise.all([
      fetch("/api/sheets/bookings").then(r => r.json() as Promise<{ data: BookingRow[] }>),
      fetch("/api/sheets/properties").then(r => r.json() as Promise<{ data: PropertyRow[] }>),
    ]).then(([bj, pj]) => {
      setBookings(bj.data ?? []);
      setProperties(pj.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  function handleSaved(b: BookingRow) {
    setBookings(prev => {
      const idx = prev.findIndex(x => x.id === b.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = b; return next; }
      return [b, ...prev];
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this booking?")) return;
    const res = await fetch("/api/sheets/bookings", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (res.ok) setBookings(prev => prev.filter(b => b.id !== id));
  }

  // Filter
  const filtered = bookings.filter(b => {
    if (filterProperty !== "all" && b.property_id !== filterProperty) return false;
    if (filterStatus !== "all" && b.status !== filterStatus) return false;
    return true;
  }).sort((a, b) => b.check_in.localeCompare(a.check_in));

  // Totals
  const totals = filtered.reduce(
    (acc, b) => {
      if (b.status !== "cancelled") {
        acc.gross += b.gross_revenue;
        acc.fees += b.platform_fee;
        acc.net += b.net_revenue;
        acc.nights += b.nights;
      }
      return acc;
    },
    { gross: 0, fees: 0, net: 0, nights: 0 }
  );

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5]">Bookings</h1>
          <p className="text-sm text-[#525252] mt-0.5">{filtered.filter(b => b.status !== "cancelled").length} bookings</p>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }} size="md">+ Add Booking</Button>
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
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="text-sm bg-[#1a1a1a] border border-[#2a2a2a] text-[#f5f5f5] rounded-lg px-3 py-2 focus:outline-none focus:border-ocean"
        >
          <option value="all">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {loading ? <TableSkeleton /> : filtered.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📅</p>
            <p className="text-[#f5f5f5] font-semibold mb-1">No bookings yet</p>
            <p className="text-sm text-[#525252] mb-4">Log your first booking to start tracking revenue.</p>
            <Button onClick={() => { setEditing(null); setModalOpen(true); }}>Add Your First Booking</Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Totals bar */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: "Gross", value: formatCurrency(totals.gross) },
              { label: "Fees", value: formatCurrency(totals.fees) },
              { label: "Net", value: formatCurrency(totals.net) },
              { label: "Nights", value: String(totals.nights) },
            ].map(t => (
              <div key={t.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 text-center">
                <p className="text-xs text-[#525252] mb-1">{t.label}</p>
                <p className="font-semibold text-[#f5f5f5] text-sm">{t.value}</p>
              </div>
            ))}
          </div>

          {/* Booking cards */}
          <div className="space-y-2">
            {filtered.map(b => (
              <Card key={b.id} padding="md">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-[#f5f5f5] text-sm">{b.property_name}</span>
                      <Badge variant={STATUS_VARIANT[b.status] ?? "neutral"}>{b.status}</Badge>
                      <Badge variant="ocean">{b.platform}</Badge>
                    </div>
                    <p className="text-xs text-[#a3a3a3] mb-2">
                      {b.check_in} → {b.check_out} · {b.nights} night{b.nights !== 1 ? "s" : ""}{b.guests > 0 ? ` · ${b.guests} guest${b.guests !== 1 ? "s" : ""}` : ""}
                    </p>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-[#525252]">Gross: <span className="text-[#a3a3a3]">{formatCurrency(b.gross_revenue)}</span></span>
                      {b.platform_fee > 0 && <span className="text-[#525252]">Fee: <span className="text-loss">-{formatCurrency(b.platform_fee)}</span></span>}
                      <span className="text-[#525252]">Net: <span className={b.net_revenue >= 0 ? "text-profit font-medium" : "text-loss font-medium"}>{formatCurrency(b.net_revenue)}</span></span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => { setEditing(b); setModalOpen(true); }}
                      className="text-xs text-[#525252] hover:text-[#a3a3a3] transition-colors"
                    >Edit</button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="text-xs text-[#525252] hover:text-loss transition-colors"
                    >Delete</button>
                  </div>
                </div>
                {b.notes && <p className="text-xs text-[#525252] mt-2 border-t border-[#2a2a2a] pt-2">{b.notes}</p>}
              </Card>
            ))}
          </div>
        </>
      )}

      <BookingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        initial={editing}
        properties={properties}
      />
    </div>
  );
}
