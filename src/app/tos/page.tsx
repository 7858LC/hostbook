import Link from "next/link"

export default function TosPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] px-4 py-12 max-w-2xl mx-auto">
      <Link href="/" className="text-xs text-emerald-400 hover:text-emerald-300 mb-8 inline-block">← LeadFlow</Link>

      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-[#525252] mb-8">Last updated: June 2026</p>

      <div className="space-y-8 text-sm text-[#a3a3a3] leading-relaxed">

        <section>
          <h2 className="text-base font-semibold text-[#f5f5f5] mb-3">1. What LeadFlow Is</h2>
          <p>LeadFlow is a lead marketplace that identifies homeowners publicly posting requests for trades services (HVAC, plumbing, electrical, roofing) and connects licensed contractors with those opportunities. LeadFlow is operated by Uzimaamka.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#f5f5f5] mb-3">2. Lead Signals, Not Guaranteed Jobs</h2>
          <p>When you purchase a lead, you are purchasing a <strong className="text-[#f5f5f5]">verified lead signal</strong> — evidence that a real person publicly expressed a need for services. LeadFlow does not guarantee that any lead will result in a scheduled appointment, booked job, or closed contract. Conversion depends entirely on your follow-up, availability, pricing, and the homeowner&apos;s decision.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#f5f5f5] mb-3">3. All Sales Are Final</h2>
          <p>All lead purchases are <strong className="text-[#f5f5f5]">final and non-refundable</strong>. Upon confirmed payment, full contact details are delivered to you immediately and the lead is removed from the marketplace. No refunds will be issued for any reason, including inability to reach the homeowner.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#f5f5f5] mb-3">4. Exclusivity</h2>
          <p>Each lead is sold to one contractor only. Once you claim a lead, no other contractor will receive the same contact details through LeadFlow. Exclusivity applies to our platform only and does not prevent the homeowner from independently contacting other service providers.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#f5f5f5] mb-3">5. Contractor Responsibilities</h2>
          <p>You are solely responsible for your own outreach, licensing, insurance, service quality, and compliance with all applicable laws. You must hold a valid contractor license for your trade and state. LeadFlow is not a party to any transaction between you and a homeowner.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#f5f5f5] mb-3">6. Contact and Outreach</h2>
          <p>By using LeadFlow, you agree to contact homeowners only for the purpose of fulfilling their stated service request and in compliance with the TCPA and all applicable telecommunications laws. You may not use contact information obtained through LeadFlow for marketing, solicitation, or any purpose unrelated to the purchased lead.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#f5f5f5] mb-3">7. Account Termination</h2>
          <p>LeadFlow reserves the right to suspend or terminate any contractor account for abuse, misrepresentation, invalid licensing, or violations of these terms.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#f5f5f5] mb-3">8. Limitation of Liability</h2>
          <p>LeadFlow&apos;s liability to you for any claim arising from use of the platform is limited to the amount paid for the specific lead in question. We are not liable for lost revenue, missed opportunities, or any indirect damages.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#f5f5f5] mb-3">9. Contact</h2>
          <p>Questions? Email us at <a href="mailto:hello@uzimaamka.com" className="text-emerald-400 hover:text-emerald-300">hello@uzimaamka.com</a></p>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t border-[#1a1a1a]">
        <Link href="/privacy" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">Privacy Policy →</Link>
      </div>
    </div>
  )
}
