export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-[#a3a3a3] text-sm leading-relaxed">
      <h1 className="text-2xl font-bold text-[#f5f5f5] mb-2">Terms of Service</h1>
      <p className="text-xs text-[#525252] mb-8">Last updated: {new Date().getFullYear()}</p>

      <section className="mb-6">
        <h2 className="font-semibold text-[#f5f5f5] mb-2">1. Acceptance</h2>
        <p>By using HostBook you agree to these terms. If you do not agree, do not use the service.</p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-[#f5f5f5] mb-2">2. Description</h2>
        <p>HostBook is a bookkeeping tool for short-term rental (STR) operators. It stores your data in a Google Sheet in your own Google Drive account using your Google OAuth credentials.</p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-[#f5f5f5] mb-2">3. Not Tax or Financial Advice</h2>
        <p className="mb-2">HostBook provides organizational tools and estimated calculations only. Nothing in the app constitutes tax advice, financial advice, or legal advice.</p>
        <p>Tax estimates are approximations based on data you enter and a rate you configure. You are solely responsible for verifying your actual tax obligations with a qualified tax professional before filing.</p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-[#f5f5f5] mb-2">4. Your Data</h2>
        <p>Your financial data is stored in a Google Spreadsheet in your own Google Drive. We access it only to provide the service. We do not sell or share your data with third parties.</p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-[#f5f5f5] mb-2">5. Subscription and Billing</h2>
        <p>Paid plans are billed via Stripe. Subscriptions renew automatically. You may cancel at any time through the billing portal in Settings. No refunds on partial billing periods unless required by law.</p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-[#f5f5f5] mb-2">6. Account Termination</h2>
        <p>You may delete your account at any time from Settings. Your Google Spreadsheet remains in your Drive even after account deletion.</p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-[#f5f5f5] mb-2">7. Limitation of Liability</h2>
        <p>HostBook is provided "as is." We are not liable for errors in calculations, data loss, or any financial consequences arising from use of the service. Our total liability is limited to the amount you paid in the last 3 months.</p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-[#f5f5f5] mb-2">8. Changes</h2>
        <p>We may update these terms at any time. Continued use after changes constitutes acceptance.</p>
      </section>

      <a href="/" className="text-ocean hover:underline text-xs">← Back to HostBook</a>
    </div>
  );
}
