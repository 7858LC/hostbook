"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { createBrowserSupabase } from "@/lib/auth"
import type { User } from "@supabase/supabase-js"

export default function Nav() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabase = createBrowserSupabase()
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => setUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    const supabase = createBrowserSupabase()
    if (supabase) await supabase.auth.signOut()
    window.location.href = "/login"
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 h-14 border-b border-[#1a1a1a] bg-[#050505]/95 backdrop-blur flex items-center px-4 md:px-8 gap-6">
      <Link href="/" className="text-sm font-bold text-emerald-400">LeadFlow</Link>
      <div className="flex gap-4 text-sm">
        <Link href="/" className="text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors">Dashboard</Link>
        <Link href="/leads" className="text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors">Leads</Link>
        <Link href="/buyers" className="text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors">Buyers</Link>
      </div>
      <div className="ml-auto flex items-center gap-3">
        {user ? (
          <>
            <Link href="/portal" className="text-xs text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors">Portal</Link>
            <button onClick={() => void signOut()} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-[#525252] hover:text-[#a3a3a3] transition-colors">
              Sign out
            </button>
          </>
        ) : (
          <Link href="/login" className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-[#a3a3a3] hover:border-[#3a3a3a] transition-colors">
            Sign in
          </Link>
        )}
        <Link href="/join" className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-900/40 text-emerald-400 border border-emerald-800 hover:bg-emerald-900/70 transition-colors">
          + Buyer Signup
        </Link>
      </div>
    </nav>
  )
}
