"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const PRIMARY = [
  { href: "/",          label: "Dashboard", icon: "⊞" },
  { href: "/properties",label: "Properties",icon: "⌂" },
  { href: "/bookings",  label: "Bookings",  icon: "📅" },
  { href: "/expenses",  label: "Expenses",  icon: "💳" },
];

const MORE = [
  { href: "/reports",  label: "Reports" },
  { href: "/tax",      label: "Tax" },
  { href: "/settings", label: "Settings" },
];

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-30" onClick={() => setMoreOpen(false)}>
          <div className="absolute bottom-16 left-0 right-0 bg-[#1a1a1a] border-t border-[#2a2a2a] px-4 py-3 space-y-1">
            {MORE.map(m => (
              <Link key={m.href} href={m.href} onClick={() => setMoreOpen(false)}
                className="block px-4 py-3 text-sm font-medium text-[#f5f5f5] hover:bg-[#2a2a2a] rounded-xl">
                {m.label}
              </Link>
            ))}
          </div>
        </div>
      )}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0f0f0f]/95 backdrop-blur border-t border-[#1a1a1a] flex">
        {PRIMARY.map(item => (
          <Link key={item.href} href={item.href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${pathname === item.href ? "text-ocean" : "text-[#525252]"}`}>
            <span className="text-lg leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
        <button onClick={() => setMoreOpen(v => !v)}
          className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${moreOpen ? "text-ocean" : "text-[#525252]"}`}>
          <span className="text-lg leading-none">⋯</span>
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
