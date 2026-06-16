import Link from "next/link"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] px-4 py-12 max-w-2xl mx-auto">
      <Link href="/" className="text-xs text-emerald-400 hover:text-emerald-300 mb-8 inline-block">← LeadFlow</Link>

      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-[#525252] mb-8">Last updated: June 2026</p>

      <div className="space-y-8 text-sm text-[#a3a3a3] leading-relaxed">

        <section>
          <h2 className="text-base font-semibold text-[#f5f5f5] mb-3">1. Information We Collect</h2>
          <p className="mb-2"><strong className="text-[#f5f5f5]">Contractors:</strong> When you register, we collect your business name, contact name, email, phone, contractor license number, and service coverage preferences.</p>
          <p><strong className="text-[#f5f5f5]">Homeowners:</strong> When you submit a service request through our intake form, we collect your name, phone number, and optionally your email. This information is provided voluntarily and is shared exclusively with the one contractor who claims your lead.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#f5f5f5] mb-3">2. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-1.5">
            <li>To match homeowner service requests with qualified contractors</li>
            <li>To deliver lead contact information to the purchasing contractor</li>
            <li>To send transactional emails (lead notifications, payment confirmations)</li>
            <li>To maintain your contractor account and track lead history</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#f5f5f5] mb-3">3. Information Sharing</h2>
          <p>We do not sell your personal information. Homeowner contact details are shared only with the single contractor who purchases the exclusive lead. We use Stripe for payment processing and Resend for transactional email — each governed by their own privacy policies.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#f5f5f5] mb-3">4. Data Sources</h2>
          <p>LeadFlow identifies service requests from publicly available posts on Reddit, Facebook neighborhood groups, and other public platforms. We do not scrape private communications or accounts.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#f5f5f5] mb-3">5. Data Retention</h2>
          <p>Contractor account data is retained for the duration of your account. Homeowner contact information is retained in our system for 90 days after a lead is claimed, then deleted. You may request deletion of your data at any time.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#f5f5f5] mb-3">6. Security</h2>
          <p>Data is stored in Supabase (SOC 2 Type II certified). Payments are processed by Stripe and we never store card numbers. Access to lead data requires authentication.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#f5f5f5] mb-3">7. Your Rights</h2>
          <p>You may request access to, correction of, or deletion of your personal data by emailing <a href="mailto:hello@uzimaamka.com" className="text-emerald-400 hover:text-emerald-300">hello@uzimaamka.com</a>. We will respond within 30 days.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#f5f5f5] mb-3">8. Contact</h2>
          <p>Uzimaamka · <a href="mailto:hello@uzimaamka.com" className="text-emerald-400 hover:text-emerald-300">hello@uzimaamka.com</a></p>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t border-[#1a1a1a]">
        <Link href="/tos" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">Terms of Service →</Link>
      </div>
    </div>
  )
}
