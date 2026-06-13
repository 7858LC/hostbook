import type { Metadata } from "next"
import "./globals.css"
import Nav from "@/components/Nav"

export const metadata: Metadata = { title: "LeadFlow — Trades Lead Marketplace", description: "Warm leads for HVAC, plumbing, and electrical professionals" }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#050505] text-[#f5f5f5] antialiased min-h-screen">
        <Nav />
        {children}
      </body>
    </html>
  )
}
