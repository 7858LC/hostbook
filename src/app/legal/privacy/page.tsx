export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-[#a3a3a3] text-sm leading-relaxed">
      <h1 className="text-2xl font-bold text-[#f5f5f5] mb-2">Privacy Policy</h1>
      <p className="text-xs text-[#525252] mb-8">Last updated: {new Date().getFullYear()}</p>

      <section className="mb-6">
        <h2 className="font-semibold text-[#f5f5f5] mb-2">1. What We Collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Google account email</strong> — used to identify your account and associate it with your spreadsheet.</li>
          <li><strong>Google OAuth tokens</strong> — used to create and access your Google Sheet on your behalf. Stored encrypted in your session.</li>
          <li><strong>Data you enter</strong> — properties, bookings, expenses — stored in your own Google Drive spreadsheet, not our servers.</li>
          <li><strong>Stripe billing info</strong> — name, email, and payment method managed by Stripe. We store only your Stripe customer ID.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-[#f5f5f5] mb-2">2. Google OAuth Scopes</h2>
        <p className="mb-2">We request the following Google OAuth scopes:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>drive.file</strong> — create and access only the specific spreadsheet HostBook creates in your Drive. We cannot see any other files.</li>
          <li><strong>userinfo.email / userinfo.profile</strong> — read your email and name for authentication.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-[#f5f5f5] mb-2">3. How We Use Your Data</h2>
        <p>We use your data solely to provide the HostBook service — reading and writing your financial records. We do not sell, rent, or share your data with third parties except Stripe (billing) and Google (storage).</p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-[#f5f5f5] mb-2">4. Data Storage and Security</h2>
        <p>Your rental data lives in a Google Sheet in your Google Drive. We access it via a service account with permissions limited to that file. Session tokens are encrypted. We use HTTPS for all connections.</p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-[#f5f5f5] mb-2">5. Data Retention</h2>
        <p>Your Google Sheet stays in your Drive indefinitely — even after you delete your HostBook account. When you delete your account, we remove your entry from our registry and clear the data in your sheet, but the sheet file itself remains yours.</p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-[#f5f5f5] mb-2">6. Your Rights</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Access:</strong> Open your Google Sheet at any time to see all data.</li>
          <li><strong>Export:</strong> Use the CSV export in any report page.</li>
          <li><strong>Delete:</strong> Delete your account and all data from Settings → Danger Zone.</li>
          <li><strong>Revoke:</strong> Revoke Google access at myaccount.google.com/permissions at any time.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-[#f5f5f5] mb-2">7. Cookies</h2>
        <p>We use one session cookie to keep you signed in. We do not use tracking or advertising cookies.</p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-[#f5f5f5] mb-2">8. Contact</h2>
        <p>Questions about privacy? Email us at the address on your receipt or in your account confirmation email.</p>
      </section>

      <a href="/" className="text-ocean hover:underline text-xs">← Back to HostBook</a>
    </div>
  );
}
