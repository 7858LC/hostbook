"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/icp", label: "ICPs" },
  { href: "/products", label: "Products" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/leads", label: "Leads" },
]

export function Nav() {
  const path = usePathname()
  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-[#0a0a0a]/95 backdrop-blur border-b border-[#1a1a1a] flex items-center px-4 md:px-8">
      <Link href="/" className="font-bold text-ocean mr-8 text-lg tracking-tight">ICN</Link>
      <nav className="flex gap-1 flex-1 overflow-x-auto">
        {LINKS.map(l => (
          <Link key={l.href} href={l.href}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${path === l.href ? "bg-[#1a1a1a] text-ocean" : "text-[#a3a3a3] hover:text-[#f5f5f5]"}`}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
