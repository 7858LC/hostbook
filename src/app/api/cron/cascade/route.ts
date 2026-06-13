import { NextRequest, NextResponse } from "next/server"
import { checkAndAdvanceStaleLeads } from "@/lib/cascade"

// Called by Vercel Cron every 10 minutes.
// Advances any cascade that has been waiting longer than its urgency timeout.
export async function GET(req: NextRequest) {
  // Basic protection: Vercel sends the CRON_SECRET as a Bearer token
  const authHeader = req.headers.get("authorization")
  const secret = process.env.CRON_SECRET
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const results = await checkAndAdvanceStaleLeads()
  return NextResponse.json({ checked: results.length, results })
}
