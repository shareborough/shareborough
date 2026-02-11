import { sendSms } from "../worker/sms";

describe("sendSms", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("sends SMS via Telnyx API and returns messageId", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: "msg-abc123" } }),
    });

    const result = await sendSms({
      to: "+15551234567",
      message: "Your item is due tomorrow!",
      apiKey: "KEY_test",
      from: "+15559876543",
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe("msg-abc123");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.telnyx.com/v2/messages",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer KEY_test",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "+15559876543",
          to: "+15551234567",
          text: "Your item is due tomorrow!",
        }),
      }),
    );
  });

  it("returns error on API failure", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Unauthorized"),
    });

    const result = await sendSms({
      to: "+15551234567",
      message: "Test",
      apiKey: "BAD_KEY",
      from: "+15559876543",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("401");
    expect(result.error).toContain("Unauthorized");
  });

  it("returns error on network failure", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    await expect(
      sendSms({
        to: "+15551234567",
        message: "Test",
        apiKey: "KEY_test",
        from: "+15559876543",
      }),
    ).rejects.toThrow("Network error");
  });
});
