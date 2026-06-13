"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/properties", label: "Properties" },
  { href: "/bookings", label: "Bookings" },
  { href: "/expenses", label: "Expenses" },
  { href: "/reports", label: "Reports" },
  { href: "/tax", label: "Tax" },
  { href: "/navigator", label: "Navigator" },
];

export function TopNav() {
  const { data: session } = useSession();
  const pathname = usePathname();
  return (
    <header className="hidden md:flex fixed top-0 left-0 right-0 z-40 h-16 bg-[#0f0f0f]/95 backdrop-blur border-b border-[#1a1a1a] items-center px-6">
      <Link href="/" className="flex items-center gap-2 font-bold text-lg mr-8">
        <span className="text-ocean text-xl">⌂</span>
        <span>HostBook</span>
      </Link>
      <nav className="flex items-center gap-1 flex-1">
        {NAV_LINKS.map(l => (
          <Link key={l.href} href={l.href}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${pathname === l.href ? "bg-[#1a1a1a] text-ocean" : "text-[#a3a3a3] hover:text-[#f5f5f5]"}`}>
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        {session?.user?.image && (
          <Image src={session.user.image} alt="" width={28} height={28} className="rounded-full" />
        )}
        <button onClick={() => void signOut({ callbackUrl: "/landing" })} className="text-xs text-[#525252] hover:text-[#a3a3a3] transition-colors">Sign out</button>
      </div>
    </header>
  );
}
