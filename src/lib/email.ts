export async function sendEmail(to: string, subject: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/send-outreach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, subject, message: body }),
  })
  const data = await res.json() as { sent?: boolean; error?: string }
  return { ok: res.ok && !!data.sent, error: data.error }
}
