import type { Metadata, Viewport } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Providers } from "./providers";
import { TopNav } from "@/components/layout/TopNav";
import { BottomNav } from "@/components/layout/BottomNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "HostBook — STR Income Tracker",
  description: "Track your short-term rental income, expenses, and Schedule E taxes. Your data stays in your Google Drive.",
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#0f0f0f",
};

const DEMO_SESSION = {
  user: { name: "Demo User", email: "demo@hostbook.local", image: null },
  expires: "2099-01-01T00:00:00.000Z",
  spreadsheetId: "__demo__",
  subscriptionStatus: "trialing" as const,
  trialEndDate: new Date(Date.now() + 30 * 86400000).toISOString(),
  accessToken: "",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const isDemo = process.env.DEMO_MODE === "true";
  const session = isDemo ? DEMO_SESSION : await getServerSession(authOptions);
  return (
    <html lang="en">
      <head />
      <body className="bg-background text-[#f5f5f5] min-h-screen">
        <Providers session={session}>
          {session && <TopNav />}
          <main className={session ? "pb-20 md:pb-0 md:pt-16 min-h-screen" : "min-h-screen"}>
            {children}
          </main>
          {session && <BottomNav />}
        </Providers>
      </body>
    </html>
  );
}
