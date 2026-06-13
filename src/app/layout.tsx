import type { Metadata } from "next"
import "./globals.css"
import { Nav } from "@/components/Nav"

export const metadata: Metadata = {
  title: "ICN — Ideal Customer Navigator",
  description: "Autopilot lead discovery, vetting & personalized outreach",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  )
}
