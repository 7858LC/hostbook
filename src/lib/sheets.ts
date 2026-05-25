import { google } from "googleapis";
import type { sheets_v4 } from "googleapis";
import { nanoid } from "nanoid";
import { withExponentialBackoff } from "./backoff";
import { logger } from "./logger";
import type { PropertyRow, BookingRow, ExpenseRow, Settings } from "@/types";

export const IS_DEMO = (id: string) => id === "__demo__";

// ---------------------------------------------------------------------------
// Auth — service account for all reads/writes after initial creation
// ---------------------------------------------------------------------------
function getAuth() {
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    ?.replace(/^["']|["'],?$/g, "")
    ?.replace(/\\n/g, "\n");
  if (!privateKey || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL)
    throw new Error("Google service account credentials not configured");
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"],
  });
}

function getSheetsClient(): sheets_v4.Sheets {
  return google.sheets({ version: "v4", auth: getAuth() });
}

// ---------------------------------------------------------------------------
// Registry — master spreadsheet maps email → user spreadsheet ID
// ---------------------------------------------------------------------------
const registryCache = new Map<string, string>();

async function lookupUserSpreadsheet(email: string): Promise<string | null> {
  if (registryCache.has(email)) return registryCache.get(email)!;
  const masterSpreadsheetId = process.env.MASTER_SPREADSHEET_ID;
  if (!masterSpreadsheetId) throw new Error("MASTER_SPREADSHEET_ID not configured");
  const sheets = getSheetsClient();
  const result = await withExponentialBackoff(() =>
    sheets.spreadsheets.values.get({ spreadsheetId: masterSpreadsheetId, range: "Users!A:B" })
  );
  const rows = result.data.values ?? [];
  for (const row of rows) {
    if (row[0] === email) {
      const id = row[1] as string;
      registryCache.set(email, id);
      return id;
    }
  }
  return null;
}

async function registerUserSpreadsheet(email: string, spreadsheetId: string): Promise<void> {
  const masterSpreadsheetId = process.env.MASTER_SPREADSHEET_ID;
  if (!masterSpreadsheetId) throw new Error("MASTER_SPREADSHEET_ID not configured");
  const sheets = getSheetsClient();
  await withExponentialBackoff(() =>
    sheets.spreadsheets.values.append({
      spreadsheetId: masterSpreadsheetId,
      range: "Users!A:B",
      valueInputOption: "RAW",
      requestBody: { values: [[email, spreadsheetId]] },
    })
  );
  registryCache.set(email, spreadsheetId);
}

// ---------------------------------------------------------------------------
// Sheet headers
// ---------------------------------------------------------------------------
const PROPERTY_HEADERS = ["id", "name", "address", "bedrooms", "bathrooms", "max_guests", "nightly_rate", "active", "notes"];
const BOOKING_HEADERS  = ["id", "property_id", "property_name", "check_in", "check_out", "nights", "guests", "platform", "gross_revenue", "cleaning_fee", "platform_fee", "net_revenue", "status", "notes"];
const EXPENSE_HEADERS  = ["id", "property_id", "property_name", "date", "category", "schedule_e_line", "description", "amount", "tax_deductible", "receipt_url", "notes"];
const SETTINGS_KEYS    = ["business_name", "state", "tax_rate", "stripe_customer_id", "stripe_subscription_id", "subscription_status", "trial_end_date", "spreadsheet_id"];

// ---------------------------------------------------------------------------
// Spreadsheet creation — runs in user's Drive (service account has no quota)
// ---------------------------------------------------------------------------
export async function getOrCreateSpreadsheet(email: string, userAccessToken?: string): Promise<string> {
  const existing = await lookupUserSpreadsheet(email);
  if (existing) return existing;

  if (!userAccessToken) throw new Error("Cannot create spreadsheet: no user access token available.");

  logger.info("Creating new HostBook spreadsheet for user", { email });

  const trialEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;

  const userAuth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  userAuth.setCredentials({ access_token: userAccessToken });
  const userSheets = google.sheets({ version: "v4", auth: userAuth });
  const userDrive = google.drive({ version: "v3", auth: userAuth });

  // Create spreadsheet in user's Drive
  const created = await withExponentialBackoff(() =>
    userSheets.spreadsheets.create({
      requestBody: {
        properties: { title: "HostBook — My STR Tracker" },
        sheets: [
          { properties: { title: "Properties" } },
          { properties: { title: "Bookings" } },
          { properties: { title: "Expenses" } },
          { properties: { title: "Settings" } },
        ],
      },
    })
  );

  const spreadsheetId = created.data.spreadsheetId!;

  // Share with service account for ongoing access
  await userDrive.permissions.create({
    fileId: spreadsheetId,
    requestBody: { role: "writer", type: "user", emailAddress: serviceAccountEmail },
  });

  // Write headers and initial data using service account
  const sheets = getSheetsClient();
  await withExponentialBackoff(() =>
    sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: [
          { range: "Properties!A1:I1", values: [PROPERTY_HEADERS] },
          { range: "Bookings!A1:N1",   values: [BOOKING_HEADERS] },
          { range: "Expenses!A1:K1",   values: [EXPENSE_HEADERS] },
          {
            range: "Settings!A:B",
            values: [
              ["business_name", ""],
              ["state", ""],
              ["tax_rate", "25"],
              ["stripe_customer_id", ""],
              ["stripe_subscription_id", ""],
              ["subscription_status", "trialing"],
              ["trial_end_date", trialEndDate],
              ["spreadsheet_id", spreadsheetId],
            ],
          },
        ],
      },
    })
  );

  await registerUserSpreadsheet(email, spreadsheetId);
  logger.info("HostBook spreadsheet created", { email, spreadsheetId });
  return spreadsheetId;
}

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------
function rowToProperty(row: string[]): PropertyRow {
  return {
    id:           row[0] ?? "",
    name:         row[1] ?? "",
    address:      row[2] ?? "",
    bedrooms:     parseInt(row[3] ?? "0") || 0,
    bathrooms:    parseFloat(row[4] ?? "0") || 0,
    max_guests:   parseInt(row[5] ?? "0") || 0,
    nightly_rate: parseInt(row[6] ?? "0") || 0,
    active:       (row[7] as "yes" | "no") ?? "yes",
    notes:        row[8] ?? "",
  };
}

export async function getProperties(spreadsheetId: string): Promise<PropertyRow[]> {
  if (IS_DEMO(spreadsheetId)) return [];
  const sheets = getSheetsClient();
  const res = await withExponentialBackoff(() =>
    sheets.spreadsheets.values.get({ spreadsheetId, range: "Properties!A2:I" })
  );
  return (res.data.values ?? []).filter(r => r[0]).map(r => rowToProperty(r as string[]));
}

export async function addProperty(spreadsheetId: string, p: Omit<PropertyRow, "id">): Promise<PropertyRow> {
  const sheets = getSheetsClient();
  const id = nanoid(10);
  const row = [id, p.name, p.address, String(p.bedrooms), String(p.bathrooms), String(p.max_guests), String(p.nightly_rate), p.active, p.notes];
  await withExponentialBackoff(() =>
    sheets.spreadsheets.values.append({
      spreadsheetId, range: "Properties!A:I", valueInputOption: "RAW",
      requestBody: { values: [row] },
    })
  );
  return { id, ...p };
}

export async function updateProperty(spreadsheetId: string, id: string, updates: Partial<Omit<PropertyRow, "id">>): Promise<PropertyRow> {
  const properties = await getProperties(spreadsheetId);
  const idx = properties.findIndex(p => p.id === id);
  if (idx === -1) throw new Error(`Property ${id} not found`);
  const merged = { ...properties[idx]!, ...updates };
  const sheets = getSheetsClient();
  const rowNum = idx + 2;
  const row = [merged.id, merged.name, merged.address, String(merged.bedrooms), String(merged.bathrooms), String(merged.max_guests), String(merged.nightly_rate), merged.active, merged.notes];
  await withExponentialBackoff(() =>
    sheets.spreadsheets.values.update({
      spreadsheetId, range: `Properties!A${rowNum}:I${rowNum}`, valueInputOption: "RAW",
      requestBody: { values: [row] },
    })
  );
  return merged;
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------
function rowToBooking(row: string[]): BookingRow {
  return {
    id:            row[0] ?? "",
    property_id:   row[1] ?? "",
    property_name: row[2] ?? "",
    check_in:      row[3] ?? "",
    check_out:     row[4] ?? "",
    nights:        parseInt(row[5] ?? "0") || 0,
    guests:        parseInt(row[6] ?? "1") || 1,
    platform:      row[7] ?? "",
    gross_revenue: parseInt(row[8] ?? "0") || 0,
    cleaning_fee:  parseInt(row[9] ?? "0") || 0,
    platform_fee:  parseInt(row[10] ?? "0") || 0,
    net_revenue:   parseInt(row[11] ?? "0") || 0,
    status:        (row[12] as BookingRow["status"]) ?? "confirmed",
    notes:         row[13] ?? "",
  };
}

export async function getBookings(spreadsheetId: string): Promise<BookingRow[]> {
  if (IS_DEMO(spreadsheetId)) return [];
  const sheets = getSheetsClient();
  const res = await withExponentialBackoff(() =>
    sheets.spreadsheets.values.get({ spreadsheetId, range: "Bookings!A2:N" })
  );
  return (res.data.values ?? []).filter(r => r[0]).map(r => rowToBooking(r as string[]));
}

export async function addBooking(spreadsheetId: string, b: Omit<BookingRow, "id">): Promise<BookingRow> {
  const sheets = getSheetsClient();
  const id = nanoid(10);
  const row = [id, b.property_id, b.property_name, b.check_in, b.check_out, String(b.nights), String(b.guests), b.platform, String(b.gross_revenue), String(b.cleaning_fee), String(b.platform_fee), String(b.net_revenue), b.status, b.notes];
  await withExponentialBackoff(() =>
    sheets.spreadsheets.values.append({
      spreadsheetId, range: "Bookings!A:N", valueInputOption: "RAW",
      requestBody: { values: [row] },
    })
  );
  return { id, ...b };
}

export async function updateBooking(spreadsheetId: string, id: string, updates: Partial<Omit<BookingRow, "id">>): Promise<BookingRow> {
  const bookings = await getBookings(spreadsheetId);
  const idx = bookings.findIndex(b => b.id === id);
  if (idx === -1) throw new Error(`Booking ${id} not found`);
  const merged = { ...bookings[idx]!, ...updates };
  const sheets = getSheetsClient();
  const rowNum = idx + 2;
  const row = [merged.id, merged.property_id, merged.property_name, merged.check_in, merged.check_out, String(merged.nights), String(merged.guests), merged.platform, String(merged.gross_revenue), String(merged.cleaning_fee), String(merged.platform_fee), String(merged.net_revenue), merged.status, merged.notes];
  await withExponentialBackoff(() =>
    sheets.spreadsheets.values.update({
      spreadsheetId, range: `Bookings!A${rowNum}:N${rowNum}`, valueInputOption: "RAW",
      requestBody: { values: [row] },
    })
  );
  return merged;
}

export async function deleteBooking(spreadsheetId: string, id: string): Promise<void> {
  const bookings = await getBookings(spreadsheetId);
  const idx = bookings.findIndex(b => b.id === id);
  if (idx === -1) throw new Error(`Booking ${id} not found`);
  const sheets = getSheetsClient();
  const rowNum = idx + 2;
  await withExponentialBackoff(() =>
    sheets.spreadsheets.values.clear({ spreadsheetId, range: `Bookings!A${rowNum}:N${rowNum}` })
  );
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------
function rowToExpense(row: string[]): ExpenseRow {
  return {
    id:              row[0] ?? "",
    property_id:     row[1] ?? "",
    property_name:   row[2] ?? "",
    date:            row[3] ?? "",
    category:        row[4] ?? "",
    schedule_e_line: (row[5] ?? "Other") as ExpenseRow["schedule_e_line"],
    description:     row[6] ?? "",
    amount:          parseInt(row[7] ?? "0") || 0,
    tax_deductible:  (row[8] as "yes" | "no") ?? "yes",
    receipt_url:     row[9] ?? "",
    notes:           row[10] ?? "",
  };
}

export async function getExpenses(spreadsheetId: string): Promise<ExpenseRow[]> {
  if (IS_DEMO(spreadsheetId)) return [];
  const sheets = getSheetsClient();
  const res = await withExponentialBackoff(() =>
    sheets.spreadsheets.values.get({ spreadsheetId, range: "Expenses!A2:K" })
  );
  return (res.data.values ?? []).filter(r => r[0]).map(r => rowToExpense(r as string[]));
}

export async function addExpense(spreadsheetId: string, e: Omit<ExpenseRow, "id">): Promise<ExpenseRow> {
  const sheets = getSheetsClient();
  const id = nanoid(10);
  const row = [id, e.property_id, e.property_name, e.date, e.category, e.schedule_e_line, e.description, String(e.amount), e.tax_deductible, e.receipt_url, e.notes];
  await withExponentialBackoff(() =>
    sheets.spreadsheets.values.append({
      spreadsheetId, range: "Expenses!A:K", valueInputOption: "RAW",
      requestBody: { values: [row] },
    })
  );
  return { id, ...e };
}

export async function updateExpense(spreadsheetId: string, id: string, updates: Partial<Omit<ExpenseRow, "id">>): Promise<ExpenseRow> {
  const expenses = await getExpenses(spreadsheetId);
  const idx = expenses.findIndex(e => e.id === id);
  if (idx === -1) throw new Error(`Expense ${id} not found`);
  const merged = { ...expenses[idx]!, ...updates };
  const sheets = getSheetsClient();
  const rowNum = idx + 2;
  const row = [merged.id, merged.property_id, merged.property_name, merged.date, merged.category, merged.schedule_e_line, merged.description, String(merged.amount), merged.tax_deductible, merged.receipt_url, merged.notes];
  await withExponentialBackoff(() =>
    sheets.spreadsheets.values.update({
      spreadsheetId, range: `Expenses!A${rowNum}:K${rowNum}`, valueInputOption: "RAW",
      requestBody: { values: [row] },
    })
  );
  return merged;
}

export async function deleteExpense(spreadsheetId: string, id: string): Promise<void> {
  const expenses = await getExpenses(spreadsheetId);
  const idx = expenses.findIndex(e => e.id === id);
  if (idx === -1) throw new Error(`Expense ${id} not found`);
  const sheets = getSheetsClient();
  await withExponentialBackoff(() =>
    sheets.spreadsheets.values.clear({ spreadsheetId, range: `Expenses!A${idx + 2}:K${idx + 2}` })
  );
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
export async function getSettings(spreadsheetId: string): Promise<Settings> {
  if (IS_DEMO(spreadsheetId)) return {
    business_name: "Demo Host", state: "FL", tax_rate: 25,
    stripe_customer_id: "", stripe_subscription_id: "",
    subscription_status: "trialing",
    trial_end_date: new Date(Date.now() + 30 * 86400000).toISOString(),
    spreadsheet_id: "__demo__",
  };
  const sheets = getSheetsClient();
  const res = await withExponentialBackoff(() =>
    sheets.spreadsheets.values.get({ spreadsheetId, range: "Settings!A:B" })
  );
  const map: Record<string, string> = {};
  for (const row of res.data.values ?? []) {
    if (row[0]) map[row[0] as string] = (row[1] as string) ?? "";
  }
  return {
    business_name:         map["business_name"] ?? "",
    state:                 map["state"] ?? "",
    tax_rate:              parseFloat(map["tax_rate"] ?? "25") || 25,
    stripe_customer_id:    map["stripe_customer_id"] ?? "",
    stripe_subscription_id:map["stripe_subscription_id"] ?? "",
    subscription_status:   map["subscription_status"] ?? "trialing",
    trial_end_date:        map["trial_end_date"] ?? "",
    spreadsheet_id:        map["spreadsheet_id"] ?? spreadsheetId,
  };
}

export async function updateSettings(spreadsheetId: string, updates: Partial<Settings>): Promise<void> {
  const sheets = getSheetsClient();
  const res = await withExponentialBackoff(() =>
    sheets.spreadsheets.values.get({ spreadsheetId, range: "Settings!A:B" })
  );
  const rows = (res.data.values ?? []) as string[][];
  const updatedRows = rows.map(row => {
    const key = row[0];
    if (key && key in updates) {
      const val = updates[key as keyof Settings];
      return [key, val !== undefined ? String(val) : (row[1] ?? "")];
    }
    return row;
  });
  await withExponentialBackoff(() =>
    sheets.spreadsheets.values.update({
      spreadsheetId, range: "Settings!A1", valueInputOption: "RAW",
      requestBody: { values: updatedRows },
    })
  );
}
