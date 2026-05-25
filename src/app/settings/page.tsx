"use client";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Settings } from "@/types";

function SubscriptionBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    active:   { label: "Active", color: "text-profit" },
    trialing: { label: "Free Trial", color: "text-ocean" },
    past_due: { label: "Past Due", color: "text-warning" },
    canceled: { label: "Cancelled", color: "text-loss" },
  };
  const s = map[status] ?? { label: status, color: "text-[#a3a3a3]" };
  return <span className={`text-sm font-semibold ${s.color}`}>{s.label}</span>;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<Partial<Settings>>({});
  const [form, setForm] = useState({ business_name: "", state: "", tax_rate: "25" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/sheets/settings")
      .then(r => r.json() as Promise<{ data: Settings }>)
      .then(j => {
        setSettings(j.data ?? {});
        setForm({
          business_name: j.data?.business_name ?? "",
          state: j.data?.state ?? "",
          tax_rate: String(j.data?.tax_rate ?? 25),
        });
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/sheets/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: form.business_name,
          state: form.state,
          tax_rate: parseFloat(form.tax_rate) || 25,
        }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok || json.error) { setError(json.error ?? "Failed to save"); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  }

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const json = await res.json() as { data?: { url: string }; error?: string };
      if (json.data?.url) window.location.href = json.data.url;
      else setError(json.error ?? "Could not open billing portal");
    } finally { setPortalLoading(false); }
  }

  async function handleDeleteAccount() {
    const first = confirm("This will permanently delete all your HostBook data. Are you absolutely sure?");
    if (!first) return;
    const second = confirm("Last chance — this cannot be undone. Delete account?");
    if (!second) return;
    setDeletingAccount(true);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (res.ok) {
        await signOut({ callbackUrl: "/" });
      } else {
        const json = await res.json() as { error?: string };
        setError(json.error ?? "Failed to delete account");
      }
    } finally { setDeletingAccount(false); }
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-[#1a1a1a] rounded-2xl" />)}
      </div>
    </div>
  );

  const hasSubscription = !!settings.stripe_subscription_id;

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#f5f5f5]">Settings</h1>
        <p className="text-sm text-[#525252] mt-0.5">Business info and account preferences</p>
      </div>

      {/* Account info */}
      <Card padding="md" className="mb-4">
        <h2 className="font-semibold text-[#f5f5f5] mb-3">Account</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#525252]">Email</span>
            <span className="text-[#a3a3a3]">{session?.user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#525252]">Subscription</span>
            <SubscriptionBadge status={settings.subscription_status ?? "trialing"} />
          </div>
          {settings.trial_end_date && settings.subscription_status === "trialing" && (
            <div className="flex justify-between">
              <span className="text-[#525252]">Trial ends</span>
              <span className="text-[#a3a3a3]">{new Date(settings.trial_end_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Business settings */}
      <Card padding="md" className="mb-4">
        <h2 className="font-semibold text-[#f5f5f5] mb-3">Business Info</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Business / Owner Name"
            value={form.business_name}
            onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
            placeholder="John Smith or Smith Rentals LLC"
          />
          <Input
            label="State"
            value={form.state}
            onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
            placeholder="FL"
            maxLength={2}
          />
          <Input
            label="Estimated Tax Rate (%)"
            type="number"
            min="0"
            max="60"
            step="0.5"
            value={form.tax_rate}
            onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))}
            placeholder="25"
          />
          <p className="text-xs text-[#525252]">Used only for quarterly tax estimate calculations on the Tax page.</p>
          {error && <p className="text-loss text-sm">{error}</p>}
          {saved && <p className="text-profit text-sm">Saved!</p>}
          <Button type="submit" loading={saving} fullWidth>Save Changes</Button>
        </form>
      </Card>

      {/* Subscription */}
      <Card padding="md" className="mb-4">
        <h2 className="font-semibold text-[#f5f5f5] mb-1">Subscription</h2>
        <p className="text-xs text-[#525252] mb-4">Manage billing, invoices, and plan changes.</p>
        {hasSubscription ? (
          <Button variant="secondary" onClick={handlePortal} loading={portalLoading} fullWidth>
            Manage Billing →
          </Button>
        ) : (
          <a href="/subscribe" className="block">
            <Button fullWidth>Upgrade to Pro →</Button>
          </a>
        )}
      </Card>

      {/* Legal */}
      <Card padding="md" className="mb-4">
        <h2 className="font-semibold text-[#f5f5f5] mb-3">Legal</h2>
        <div className="space-y-2 text-sm">
          <a href="/legal/terms" className="block text-ocean hover:underline">Terms of Service</a>
          <a href="/legal/privacy" className="block text-ocean hover:underline">Privacy Policy</a>
        </div>
      </Card>

      {/* Danger zone */}
      <Card padding="md">
        <h2 className="font-semibold text-loss mb-1">Danger Zone</h2>
        <p className="text-xs text-[#525252] mb-4">These actions are permanent and cannot be undone.</p>
        <div className="space-y-3">
          <Button
            variant="secondary"
            onClick={() => signOut({ callbackUrl: "/" })}
            fullWidth
          >
            Sign Out
          </Button>
          <Button
            variant="secondary"
            onClick={handleDeleteAccount}
            loading={deletingAccount}
            fullWidth
          >
            <span className="text-loss">Delete Account &amp; All Data</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
