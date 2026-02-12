import { randomAddress, waitForEmail, extractLinks, deleteAllEmails } from "mailpail";
import type { MailpailConfig, ReceivedEmail } from "mailpail";

/**
 * Mailpail helper for E2E testing with disposable email addresses.
 *
 * Uses AWS SES inbound + S3 — no subscriptions, no rate limits.
 * Requires:
 *   - MAILPAIL_DOMAIN env var (e.g. "test.shareborough.com")
 *   - MAILPAIL_BUCKET env var (e.g. "ayb-ci-artifacts")
 *   - AWS credentials (IAM role on EC2, or env vars locally)
 */

function getConfig(): MailpailConfig {
  const domain = process.env.MAILPAIL_DOMAIN;
  const s3Bucket = process.env.MAILPAIL_BUCKET;

  if (!domain || !s3Bucket) {
    throw new Error(
      "Mailpail not configured. Set MAILPAIL_DOMAIN and MAILPAIL_BUCKET environment variables."
    );
  }

  return {
    domain,
    s3Bucket,
    s3Prefix: process.env.MAILPAIL_PREFIX || "e2e-emails/",
    awsRegion: process.env.MAILPAIL_REGION || "us-east-1",
  };
}

/** Check if mailpail is configured (env vars present). */
export function isConfigured(): boolean {
  return !!(process.env.MAILPAIL_DOMAIN && process.env.MAILPAIL_BUCKET);
}

/** Generate a unique disposable email address at the configured domain. */
export function createTestAddress(): string {
  return randomAddress(getConfig());
}

/**
 * Wait for an email to arrive for the given address.
 *
 * Polls S3 until a matching email is found or timeout expires.
 */
export async function waitForTestEmail(
  to: string,
  options: {
    subject?: string;
    timeout?: number;
  } = {}
): Promise<ReceivedEmail> {
  return waitForEmail(getConfig(), {
    to,
    subject: options.subject,
    timeout: options.timeout || 60_000,
  });
}

/** Extract all href links from an email's HTML body, with HTML entity decoding. */
export function extractEmailLinks(email: ReceivedEmail): string[] {
  return extractLinks(email);
}

/** Delete all test emails from S3 (cleanup between runs). */
export async function purgeTestEmails(): Promise<number> {
  return deleteAllEmails(getConfig());
}
