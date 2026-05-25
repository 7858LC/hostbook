import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";
import { getOrCreateSpreadsheet } from "./sheets";
import { logger } from "./logger";

const spreadsheetCache = new Map<string, string>();
const inFlight = new Map<string, Promise<string>>();

const DEMO_EMAIL = "demo@hostbook.local";
export const DEMO_SPREADSHEET_ID = process.env.DEMO_SPREADSHEET_ID ?? "__demo__";

export async function getSessionData(): Promise<{ email: string; spreadsheetId: string } | null> {
  // Demo mode: bypass Google auth entirely for local preview
  if (process.env.DEMO_MODE === "true") {
    return { email: DEMO_EMAIL, spreadsheetId: DEMO_SPREADSHEET_ID };
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const email = session.user.email;
  const accessToken = session.accessToken ?? "";

  if (spreadsheetCache.has(email)) return { email, spreadsheetId: spreadsheetCache.get(email)! };
  if (inFlight.has(email)) {
    try { return { email, spreadsheetId: await inFlight.get(email)! }; } catch { return null; }
  }

  const promise = getOrCreateSpreadsheet(email, accessToken)
    .then(id => { spreadsheetCache.set(email, id); inFlight.delete(email); return id; })
    .catch(err => { inFlight.delete(email); logger.error("Failed to get/create spreadsheet", { email, err }); throw err; });

  inFlight.set(email, promise);
  try { return { email, spreadsheetId: await promise }; } catch { return null; }
}
