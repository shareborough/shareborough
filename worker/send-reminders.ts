/**
 * Cron worker: sends pending SMS reminders via Telnyx.
 *
 * Usage:
 *   npx tsx worker/send-reminders.ts
 *
 * Environment variables:
 *   TELNYX_API_KEY        — Telnyx API key
 *   TELNYX_PHONE_NUMBER   — Telnyx phone number (e.g. +12025551234)
 *   AYB_URL               — AYB server URL (default: http://localhost:8090)
 *   AYB_ADMIN_TOKEN       — AYB admin token for querying system tables
 */

import { sendSms } from "./sms.js";

export interface Reminder {
  id: string;
  loan_id: string;
  message: string;
  scheduled_for: string;
  sent_at: string | null;
}

export interface Loan {
  id: string;
  borrower_id: string;
}

export interface Borrower {
  id: string;
  phone: string;
  name: string;
}

export interface WorkerConfig {
  aybUrl: string;
  aybAdminToken?: string;
  telnyxApiKey: string;
  telnyxPhoneNumber: string;
}

export function aybHeaders(adminToken?: string): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (adminToken) {
    headers["Authorization"] = `Bearer ${adminToken}`;
  }
  return headers;
}

export async function aybGet<T>(aybUrl: string, path: string, adminToken?: string): Promise<T> {
  const resp = await fetch(`${aybUrl}${path}`, { headers: aybHeaders(adminToken) });
  if (!resp.ok) throw new Error(`AYB GET ${path}: ${resp.status} ${await resp.text()}`);
  return resp.json();
}

export async function aybPatch(aybUrl: string, path: string, body: Record<string, unknown>, adminToken?: string): Promise<void> {
  const resp = await fetch(`${aybUrl}${path}`, {
    method: "PATCH",
    headers: aybHeaders(adminToken),
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`AYB PATCH ${path}: ${resp.status} ${await resp.text()}`);
}

export async function processReminders(config: WorkerConfig): Promise<{ sent: number; failed: number }> {
  const { aybUrl, aybAdminToken, telnyxApiKey, telnyxPhoneNumber } = config;

  // 1. Fetch pending reminders
  const now = new Date().toISOString();
  const remindersRes = await aybGet<{ items: Reminder[] }>(
    aybUrl,
    `/api/collections/reminders?filter=${encodeURIComponent(`sent_at=null AND scheduled_for<='${now}'`)}&sort=scheduled_for&perPage=100`,
    aybAdminToken,
  );
  const reminders = remindersRes.items;

  if (reminders.length === 0) {
    console.log("No pending reminders.");
    return { sent: 0, failed: 0 };
  }

  console.log(`Found ${reminders.length} pending reminder(s).`);

  // 2. Batch-load loans
  const loanIds = [...new Set(reminders.map((r) => r.loan_id))];
  const loanFilter = loanIds.map((id) => `id='${id}'`).join(" OR ");
  const loansRes = await aybGet<{ items: Loan[] }>(
    aybUrl,
    `/api/collections/loans?filter=${encodeURIComponent(loanFilter)}&perPage=500`,
    aybAdminToken,
  );
  const loansById = new Map(loansRes.items.map((l) => [l.id, l]));

  // 3. Batch-load borrowers
  const borrowerIds = [...new Set(loansRes.items.map((l) => l.borrower_id))];
  const borrowerFilter = borrowerIds.map((id) => `id='${id}'`).join(" OR ");
  const borrowersRes = await aybGet<{ items: Borrower[] }>(
    aybUrl,
    `/api/collections/borrowers?filter=${encodeURIComponent(borrowerFilter)}&perPage=500`,
    aybAdminToken,
  );
  const borrowersById = new Map(borrowersRes.items.map((b) => [b.id, b]));

  // 4. Send each reminder
  let sent = 0;
  let failed = 0;

  for (const reminder of reminders) {
    const loan = loansById.get(reminder.loan_id);
    if (!loan) {
      console.error(`Loan ${reminder.loan_id} not found for reminder ${reminder.id}`);
      failed++;
      continue;
    }

    const borrower = borrowersById.get(loan.borrower_id);
    if (!borrower) {
      console.error(`Borrower ${loan.borrower_id} not found for reminder ${reminder.id}`);
      failed++;
      continue;
    }

    const result = await sendSms({
      to: borrower.phone,
      message: reminder.message,
      apiKey: telnyxApiKey,
      from: telnyxPhoneNumber,
    });

    if (result.success) {
      await aybPatch(aybUrl, `/api/collections/reminders/${reminder.id}`, {
        sent_at: new Date().toISOString(),
      }, aybAdminToken);
      console.log(`Sent reminder ${reminder.id} to ${borrower.name} (${borrower.phone})`);
      sent++;
    } else {
      console.error(`Failed to send reminder ${reminder.id}: ${result.error}`);
      failed++;
    }
  }

  console.log(`Done. Sent: ${sent}, Failed: ${failed}`);
  return { sent, failed };
}

// Script entry point — only runs when executed directly.
const isMainModule = typeof process !== "undefined" && process.argv[1]?.endsWith("send-reminders.ts");
if (isMainModule) {
  const AYB_URL = process.env.AYB_URL ?? "http://localhost:8090";
  const AYB_ADMIN_TOKEN = process.env.AYB_ADMIN_TOKEN;
  const TELNYX_API_KEY = process.env.TELNYX_API_KEY;
  const TELNYX_PHONE_NUMBER = process.env.TELNYX_PHONE_NUMBER;

  if (!TELNYX_API_KEY || !TELNYX_PHONE_NUMBER) {
    console.error("Missing TELNYX_API_KEY or TELNYX_PHONE_NUMBER");
    process.exit(1);
  }

  processReminders({
    aybUrl: AYB_URL,
    aybAdminToken: AYB_ADMIN_TOKEN,
    telnyxApiKey: TELNYX_API_KEY,
    telnyxPhoneNumber: TELNYX_PHONE_NUMBER,
  }).catch((err) => {
    console.error("Worker error:", err);
    process.exit(1);
  });
}
