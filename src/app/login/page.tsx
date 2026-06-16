"use client"
export const dynamic = "force-dynamic"
import { useState } from "react"
import { createBrowserSupabase } from "@/lib/auth"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleMagicLink() {
    if (!email) return
    setLoading(true); setError("")
    const supabase = createBrowserSupabase()
    if (!supabase) { setError("Auth not configured"); setLoading(false); return }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) { setError(error.message); setLoading(false); return }
    setSent(true); setLoading(false)
  }

  async function handleGoogle() {
    setLoading(true); setError("")
    const supabase = createBrowserSupabase()
    if (!supabase) { setError("Auth not configured"); setLoading(false); return }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  const inp = "w-full px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-sm text-[#f5f5f5] placeholder-[#525252] outline-none focus:border-emerald-500 transition-colors"

  if (sent) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="text-center max-w-sm space-y-4">
        <p className="text-4xl">📧</p>
        <h1 className="text-xl font-bold text-[#f5f5f5]">Check your email</h1>
        <p className="text-sm text-[#a3a3a3]">We sent a magic link to <strong className="text-[#f5f5f5]">{email}</strong>. Click it to sign in — no password needed.</p>
        <button onClick={() => setSent(false)} className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">← Try a different email</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center">
          <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-2">LeadFlow</p>
          <h1 className="text-2xl font-bold text-[#f5f5f5]">Sign in</h1>
          <p className="text-sm text-[#525252] mt-1">Contractor portal &amp; admin dashboard</p>
        </div>

        {/* Google */}
        <button
          onClick={() => void handleGoogle()}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-[#2a2a2a] bg-[#111] text-sm font-semibold text-[#f5f5f5] hover:border-[#3a3a3a] disabled:opacity-50 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[#1a1a1a]" />
          <span className="text-xs text-[#525252]">or</span>
          <div className="flex-1 h-px bg-[#1a1a1a]" />
        </div>

        {/* Magic link */}
        <div className="space-y-3">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && void handleMagicLink()}
            className={inp}
          />
          <button
            onClick={() => void handleMagicLink()}
            disabled={loading || !email}
            className="w-full py-3 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Sending…" : "Send magic link →"}
          </button>
        </div>

        {error && <p className="text-sm text-red-400 text-center">{error}</p>}

        <p className="text-center text-xs text-[#525252]">
          No password needed. We&apos;ll email you a secure link.
        </p>

        <div className="border-t border-[#1a1a1a] pt-4 text-center">
          <p className="text-xs text-[#525252]">
            New contractor?{" "}
            <a href="/join" className="text-emerald-400 hover:text-emerald-300 transition-colors">Join LeadFlow →</a>
          </p>
        </div>
      </div>
    </div>
  )
}
