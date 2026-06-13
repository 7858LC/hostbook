import { NextRequest, NextResponse } from "next/server"
import { advanceCascade } from "@/lib/cascade"

// GET so it works as a plain link in an email — buyer clicks "Pass" and the cascade advances
export async function GET(req: NextRequest) {
  const leadId = req.nextUrl.searchParams.get("leadId")
  if (!leadId) return new NextResponse("Missing leadId", { status: 400 })

  const result = await advanceCascade(leadId)

  const messages: Record<string, string> = {
    advanced: "Passed. The lead has been offered to the next buyer.",
    expired: "Passed. No more buyers available — lead has expired.",
    already_claimed: "This lead was already claimed by another buyer.",
    not_found: "Lead not found.",
  }

  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>LeadFlow</title>
    <style>body{background:#0a0a0a;color:#a3a3a3;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-size:15px;}</style>
    </head><body>${messages[result] ?? "Done."}</body></html>`,
    { headers: { "content-type": "text/html" } }
  )
}
