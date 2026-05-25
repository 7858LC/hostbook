"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { formatCurrency, dollarsToCents, centsToDollars } from "@/lib/money";
import type { PropertyRow } from "@/types";

function PropertyModal({ open, onClose, onSaved, initial }: { open: boolean; onClose: () => void; onSaved: (p: PropertyRow) => void; initial?: PropertyRow | null }) {
  const [form, setForm] = useState({ name: "", address: "", bedrooms: "", bathrooms: "", max_guests: "", nightly_rate: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initial) {
      setForm({ name: initial.name, address: initial.address, bedrooms: String(initial.bedrooms), bathrooms: String(initial.bathrooms), max_guests: String(initial.max_guests), nightly_rate: String(centsToDollars(initial.nightly_rate)), notes: initial.notes });
    } else {
      setForm({ name: "", address: "", bedrooms: "", bathrooms: "", max_guests: "", nightly_rate: "", notes: "" });
    }
    setError("");
  }, [initial, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Property name is required"); return; }
    setLoading(true);
    try {
      const method = initial ? "PUT" : "POST";
      const body = { ...(initial ? { id: initial.id } : {}), name: form.name.trim(), address: form.address, bedrooms: parseInt(form.bedrooms) || 0, bathrooms: parseFloat(form.bathrooms) || 0, max_guests: parseInt(form.max_guests) || 0, nightly_rate: parseFloat(form.nightly_rate) || 0, notes: form.notes };
      const res = await fetch("/api/sheets/properties", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json() as { data?: PropertyRow; error?: string };
      if (!res.ok || json.error) { setError(json.error ?? "Failed to save"); return; }
      onSaved(json.data!);
      onClose();
    } finally { setLoading(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit Property" : "Add Property"}>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <Input label="Property Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Beach House, Unit 4B…" autoFocus />
        <Input label="Address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Ocean Ave, Miami FL" />
        <div className="grid grid-cols-3 gap-3">
          <Input label="Bedrooms" type="number" min="0" value={form.bedrooms} onChange={e => setForm(f => ({ ...f, bedrooms: e.target.value }))} placeholder="2" />
          <Input label="Bathrooms" type="number" min="0" step="0.5" value={form.bathrooms} onChange={e => setForm(f => ({ ...f, bathrooms: e.target.value }))} placeholder="1.5" />
          <Input label="Max Guests" type="number" min="1" value={form.max_guests} onChange={e => setForm(f => ({ ...f, max_guests: e.target.value }))} placeholder="6" />
        </div>
        <Input label="Base Nightly Rate" type="number" min="0" step="0.01" value={form.nightly_rate} onChange={e => setForm(f => ({ ...f, nightly_rate: e.target.value }))} prefix="$" placeholder="149.00" />
        <Input label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes…" />
        {error && <p className="text-loss text-sm">{error}</p>}
        <div className="flex gap-3 pt-1 pb-1">
          <Button type="button" variant="secondary" onClick={onClose} fullWidth>Cancel</Button>
          <Button type="submit" loading={loading} fullWidth>{initial ? "Save Changes" : "Add Property"}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PropertyRow | null>(null);

  useEffect(() => {
    fetch("/api/sheets/properties")
      .then(r => r.json() as Promise<{ data: PropertyRow[] }>)
      .then(j => { setProperties(j.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function handleSaved(p: PropertyRow) {
    setProperties(prev => {
      const idx = prev.findIndex(x => x.id === p.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = p; return next; }
      return [p, ...prev];
    });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5]">Properties</h1>
          <p className="text-sm text-[#525252] mt-0.5">{properties.filter(p => p.active === "yes").length} active</p>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }} size="md">+ Add Property</Button>
      </div>

      {loading ? <TableSkeleton /> : properties.length === 0 ? (
        <Card><div className="text-center py-12">
          <p className="text-4xl mb-3">⌂</p>
          <p className="text-[#f5f5f5] font-semibold mb-1">No properties yet</p>
          <p className="text-sm text-[#525252] mb-4">Add your first rental property to start tracking bookings and income.</p>
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>Add Your First Property</Button>
        </div></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {properties.map(p => (
            <Card key={p.id} padding="md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-[#f5f5f5] truncate">{p.name}</h3>
                    <Badge variant={p.active === "yes" ? "profit" : "neutral"}>{p.active === "yes" ? "Active" : "Inactive"}</Badge>
                  </div>
                  {p.address && <p className="text-xs text-[#525252] mb-2 truncate">{p.address}</p>}
                  <div className="flex items-center gap-4 text-xs text-[#a3a3a3]">
                    {p.bedrooms > 0 && <span>🛏 {p.bedrooms} bed</span>}
                    {p.bathrooms > 0 && <span>🚿 {p.bathrooms} bath</span>}
                    {p.max_guests > 0 && <span>👤 {p.max_guests} guests</span>}
                    {p.nightly_rate > 0 && <span className="text-ocean font-medium">{formatCurrency(p.nightly_rate)}/night</span>}
                  </div>
                </div>
                <button onClick={() => { setEditing(p); setModalOpen(true); }} className="text-xs text-[#525252] hover:text-[#a3a3a3] transition-colors shrink-0">Edit</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <PropertyModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={handleSaved} initial={editing} />
    </div>
  );
}
