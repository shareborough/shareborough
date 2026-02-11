/**
 * Phone-based authentication for borrowers and circle members.
 *
 * Flow: enter phone → receive OTP code (SMS in prod, console in dev) → verify → session
 * No account creation needed. Phone number IS the identity.
 */

import { rpc } from "./rpc";

const PHONE_SESSION_KEY = "shareborough_phone_session";
const PHONE_NAME_KEY = "shareborough_phone_name";

export interface PhoneSession {
  phone: string;
  name: string;
  verified: boolean;
  expiresAt: string;
}

/**
 * Request an OTP code for a phone number.
 * In development, the code is logged to the server console.
 * In production, an SMS is sent via the configured provider.
 */
export async function requestOTP(phone: string): Promise<void> {
  await rpc("request_phone_otp", { p_phone: normalizePhone(phone) });
}

/**
 * Verify an OTP code and establish a phone session.
 */
export async function verifyOTP(phone: string, code: string): Promise<PhoneSession> {
  const result = await rpc<{ verified: boolean; expires_at: string }>(
    "verify_phone_otp",
    { p_phone: normalizePhone(phone), p_code: code },
  );
  if (!result?.verified) {
    throw new Error("Invalid or expired code");
  }
  const session: PhoneSession = {
    phone: normalizePhone(phone),
    name: getStoredName() ?? "",
    verified: true,
    expiresAt: result.expires_at,
  };
  persistPhoneSession(session);
  return session;
}

/**
 * Quick phone auth: just store phone + name locally.
 * Used as fallback when OTP infrastructure isn't available.
 * Borrowers are trusted because the worst they can do is request to borrow,
 * which still requires owner approval.
 */
export function quickPhoneAuth(phone: string, name: string): PhoneSession {
  const session: PhoneSession = {
    phone: normalizePhone(phone),
    name,
    verified: false, // not OTP-verified, but sufficient for borrowing
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  };
  persistPhoneSession(session);
  return session;
}

export function getPhoneSession(): PhoneSession | null {
  try {
    const raw = localStorage.getItem(PHONE_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as PhoneSession;
    // Check expiry
    if (new Date(session.expiresAt) < new Date()) {
      clearPhoneSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearPhoneSession(): void {
  localStorage.removeItem(PHONE_SESSION_KEY);
}

export function persistPhoneSession(session: PhoneSession): void {
  localStorage.setItem(PHONE_SESSION_KEY, JSON.stringify(session));
  if (session.name) {
    localStorage.setItem(PHONE_NAME_KEY, session.name);
  }
}

export function getStoredName(): string | null {
  return localStorage.getItem(PHONE_NAME_KEY);
}

export function setStoredName(name: string): void {
  localStorage.setItem(PHONE_NAME_KEY, name);
  const session = getPhoneSession();
  if (session) {
    session.name = name;
    persistPhoneSession(session);
  }
}

export function isPhoneAuthed(): boolean {
  return getPhoneSession() !== null;
}

export function isSessionVerified(): boolean {
  const session = getPhoneSession();
  return session?.verified === true;
}

/**
 * Normalize phone to E.164-ish format.
 * Strips non-digits, adds +1 if 10 digits (US).
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (phone.startsWith("+")) return phone;
  return `+${digits}`;
}
