/**
 * Telnyx SMS sending utility.
 * No SDK required — just a single HTTP POST per message.
 */

const TELNYX_API_URL = "https://api.telnyx.com/v2/messages";

export interface SendSmsParams {
  to: string;
  message: string;
  apiKey: string;
  from: string;
}

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSms({
  to,
  message,
  apiKey,
  from,
}: SendSmsParams): Promise<SendSmsResult> {
  const response = await fetch(TELNYX_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, text: message }),
  });

  if (!response.ok) {
    const body = await response.text();
    return { success: false, error: `Telnyx API ${response.status}: ${body}` };
  }

  const data = await response.json();
  return {
    success: true,
    messageId: data?.data?.id,
  };
}
