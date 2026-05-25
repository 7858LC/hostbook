import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5]">
      {/* Nav */}
      <nav className="border-b border-[#1a1a1a] px-4 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-2 font-bold text-lg">
          <span className="text-ocean">⌂</span> HostBook
        </div>
        <div className="flex gap-3">
          <Link href="/auth/signin">
            <button className="text-sm text-[#525252] hover:text-[#f5f5f5] transition-colors px-3 py-1.5">Sign in</button>
          </Link>
          <Link href="/auth/signin">
            <button className="text-sm bg-ocean hover:bg-sky-600 text-white font-semibold px-4 py-1.5 rounded-lg transition-colors">Get Started Free</button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto text-center px-4 pt-20 pb-16">
        <div className="inline-flex items-center gap-2 bg-ocean/10 border border-ocean/20 text-ocean text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          ✦ 30-day free trial · No credit card required
        </div>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-5">
          STR bookkeeping that<br />
          <span className="text-ocean">stays in your Google Drive</span>
        </h1>
        <p className="text-lg text-[#525252] mb-8 max-w-xl mx-auto">
          Track Airbnb, VRBO, and direct bookings across all your properties. Auto-calculate Schedule E. Know your taxes before April hits.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/auth/signin">
            <button className="bg-ocean hover:bg-sky-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm">
              Start Free Trial →
            </button>
          </Link>
          <Link href="/subscribe">
            <button className="border border-[#2a2a2a] text-[#a3a3a3] hover:text-[#f5f5f5] font-semibold px-6 py-3 rounded-xl transition-colors text-sm">
              See Pricing
            </button>
          </Link>
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-4xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          {
            icon: "📊",
            title: "Multi-property dashboard",
            desc: "Occupancy rate, RevPAR, and net revenue at a glance — across every listing you own.",
          },
          {
            icon: "📋",
            title: "Schedule E ready",
            desc: "Every expense maps to an IRS Schedule E line item. Export a clean CSV at tax time, hand it to your CPA.",
          },
          {
            icon: "💰",
            title: "Platform fee tracking",
            desc: "Log exact Airbnb, VRBO, and Booking.com fees. See true net revenue, not gross illusions.",
          },
          {
            icon: "📅",
            title: "Quarterly tax estimates",
            desc: "Know what you owe before the IRS does. Set your effective rate once and watch the math update live.",
          },
          {
            icon: "🔒",
            title: "Your data, your Drive",
            desc: "Data lives in a Google Sheet you own. We can't see it. Delete your account, the sheet stays forever.",
          },
          {
            icon: "📱",
            title: "Mobile-first",
            desc: "Log a check-in from your phone right after a guest arrives. Built for hosts who are always on the move.",
          },
        ].map(f => (
          <div key={f.title} className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-5">
            <p className="text-2xl mb-3">{f.icon}</p>
            <p className="font-semibold text-[#f5f5f5] mb-1.5">{f.title}</p>
            <p className="text-sm text-[#525252] leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Platforms */}
      <section className="max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-xs text-[#525252] uppercase tracking-wider font-semibold mb-4">Works with every platform</p>
        <div className="flex flex-wrap gap-3 justify-center">
          {["Airbnb", "VRBO", "Booking.com", "Furnished Finder", "Hipcamp", "Direct", "Facebook Marketplace"].map(p => (
            <span key={p} className="text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-[#a3a3a3] px-3 py-1.5 rounded-full">{p}</span>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-[#f5f5f5] mb-3">Straightforward pricing</h2>
        <p className="text-[#525252] mb-6">30-day free trial. Then $19/month or $149/year.</p>
        <Link href="/subscribe">
          <button className="bg-ocean hover:bg-sky-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm">
            View Plans →
          </button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1a1a1a] py-8 text-center text-xs text-[#525252]">
        <p className="mb-2">
          <Link href="/legal/terms" className="hover:text-[#a3a3a3] transition-colors mr-4">Terms</Link>
          <Link href="/legal/privacy" className="hover:text-[#a3a3a3] transition-colors">Privacy</Link>
        </p>
        <p>© {new Date().getFullYear()} HostBook · Not tax advice. Consult a professional.</p>
      </footer>
    </div>
  );
}
