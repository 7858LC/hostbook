import Link from "next/link"

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 h-14 border-b border-[#1a1a1a] bg-[#050505]/95 backdrop-blur flex items-center px-4 md:px-8 gap-6">
      <Link href="/" className="text-sm font-bold text-emerald-400">LeadFlow</Link>
      <div className="flex gap-4 text-sm">
        <Link href="/" className="text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors">Dashboard</Link>
        <Link href="/leads" className="text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors">Leads</Link>
        <Link href="/buyers" className="text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors">Buyers</Link>
      </div>
      <Link href="/join" className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-900/40 text-emerald-400 border border-emerald-800 hover:bg-emerald-900/70 transition-colors">
        + Buyer Signup
      </Link>
    </nav>
  )
}
