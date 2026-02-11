import { aybHeaders, aybGet, aybPatch, processReminders } from "../worker/send-reminders";

vi.mock("../worker/sms.js", () => ({
  sendSms: vi.fn(),
}));

import { sendSms } from "../worker/sms";
const mockSendSms = vi.mocked(sendSms);

describe("aybHeaders", () => {
  it("returns Content-Type without auth when no token", () => {
    const headers = aybHeaders();
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("includes Authorization when token provided", () => {
    const headers = aybHeaders("my-token");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["Authorization"]).toBe("Bearer my-token");
  });
});

describe("aybGet", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("fetches from AYB and returns JSON", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [{ id: "1" }] }),
    });

    const result = await aybGet<{ items: { id: string }[] }>(
      "http://localhost:8090",
      "/api/collections/reminders",
      "token123",
    );

    expect(result.items).toHaveLength(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:8090/api/collections/reminders",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token123",
        }),
      }),
    );
  });

  it("throws on non-OK response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal Server Error"),
    });

    await expect(
      aybGet("http://localhost:8090", "/api/collections/reminders"),
    ).rejects.toThrow("AYB GET /api/collections/reminders: 500 Internal Server Error");
  });
});

describe("aybPatch", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("sends PATCH request with JSON body", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });

    await aybPatch(
      "http://localhost:8090",
      "/api/collections/reminders/r1",
      { sent_at: "2026-01-01T00:00:00Z" },
      "admin-token",
    );

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:8090/api/collections/reminders/r1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ sent_at: "2026-01-01T00:00:00Z" }),
        headers: expect.objectContaining({
          Authorization: "Bearer admin-token",
        }),
      }),
    );
  });

  it("throws on non-OK response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve("Not Found"),
    });

    await expect(
      aybPatch("http://localhost:8090", "/api/collections/reminders/bad", {}),
    ).rejects.toThrow("AYB PATCH /api/collections/reminders/bad: 404 Not Found");
  });
});

describe("processReminders", () => {
  const originalFetch = globalThis.fetch;
  const config = {
    aybUrl: "http://localhost:8090",
    aybAdminToken: "admin-token",
    telnyxApiKey: "telnyx-key",
    telnyxPhoneNumber: "+15550001111",
  };

  afterEach(() => {
    globalThis.fetch = originalFetch;
    mockSendSms.mockReset();
  });

  it("returns 0/0 when no pending reminders", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });

    const result = await processReminders(config);
    expect(result).toEqual({ sent: 0, failed: 0 });
  });

  it("sends SMS and marks reminder as sent", async () => {
    let fetchCallCount = 0;
    globalThis.fetch = vi.fn().mockImplementation((_url: string, opts?: RequestInit) => {
      fetchCallCount++;
      // Call 1: fetch reminders
      if (fetchCallCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              items: [
                { id: "r1", loan_id: "loan1", message: "Return item!", scheduled_for: "2026-01-01T00:00:00Z", sent_at: null },
              ],
            }),
        });
      }
      // Call 2: fetch loans
      if (fetchCallCount === 2) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              items: [{ id: "loan1", borrower_id: "b1" }],
            }),
        });
      }
      // Call 3: fetch borrowers
      if (fetchCallCount === 3) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              items: [{ id: "b1", phone: "+15552223333", name: "Alice" }],
            }),
        });
      }
      // Call 4: PATCH reminder as sent
      if (opts?.method === "PATCH") {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
    });

    mockSendSms.mockResolvedValue({ success: true, messageId: "msg-1" });

    const result = await processReminders(config);

    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(mockSendSms).toHaveBeenCalledWith({
      to: "+15552223333",
      message: "Return item!",
      apiKey: "telnyx-key",
      from: "+15550001111",
    });
  });

  it("counts failed when loan not found for reminder", async () => {
    let fetchCallCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      fetchCallCount++;
      if (fetchCallCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              items: [{ id: "r1", loan_id: "missing-loan", message: "Hi", scheduled_for: "2026-01-01T00:00:00Z", sent_at: null }],
            }),
        });
      }
      // Loans — empty (loan not found)
      if (fetchCallCount === 2) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      }
      // Borrowers — empty
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
    });

    const result = await processReminders(config);
    expect(result).toEqual({ sent: 0, failed: 1 });
    expect(mockSendSms).not.toHaveBeenCalled();
  });

  it("counts failed when borrower not found for loan", async () => {
    let fetchCallCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      fetchCallCount++;
      if (fetchCallCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              items: [{ id: "r1", loan_id: "loan1", message: "Hi", scheduled_for: "2026-01-01T00:00:00Z", sent_at: null }],
            }),
        });
      }
      if (fetchCallCount === 2) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [{ id: "loan1", borrower_id: "missing-borrower" }] }),
        });
      }
      // Borrowers — empty
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
    });

    const result = await processReminders(config);
    expect(result).toEqual({ sent: 0, failed: 1 });
    expect(mockSendSms).not.toHaveBeenCalled();
  });

  it("counts failed when SMS send fails", async () => {
    let fetchCallCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      fetchCallCount++;
      if (fetchCallCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              items: [{ id: "r1", loan_id: "loan1", message: "Hi", scheduled_for: "2026-01-01T00:00:00Z", sent_at: null }],
            }),
        });
      }
      if (fetchCallCount === 2) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [{ id: "loan1", borrower_id: "b1" }] }),
        });
      }
      if (fetchCallCount === 3) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [{ id: "b1", phone: "+15552223333", name: "Bob" }] }),
        });
      }
      return Promise.resolve({ ok: true });
    });

    mockSendSms.mockResolvedValue({ success: false, error: "Telnyx API 401: Unauthorized" });

    const result = await processReminders(config);
    expect(result).toEqual({ sent: 0, failed: 1 });
  });

  it("handles mix of successful and failed reminders", async () => {
    let fetchCallCount = 0;
    globalThis.fetch = vi.fn().mockImplementation((_url: string, opts?: RequestInit) => {
      fetchCallCount++;
      if (fetchCallCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              items: [
                { id: "r1", loan_id: "loan1", message: "Due tomorrow", scheduled_for: "2026-01-01T00:00:00Z", sent_at: null },
                { id: "r2", loan_id: "loan2", message: "Overdue", scheduled_for: "2026-01-01T00:00:00Z", sent_at: null },
              ],
            }),
        });
      }
      if (fetchCallCount === 2) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              items: [
                { id: "loan1", borrower_id: "b1" },
                { id: "loan2", borrower_id: "b2" },
              ],
            }),
        });
      }
      if (fetchCallCount === 3) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              items: [
                { id: "b1", phone: "+15551111111", name: "Alice" },
                { id: "b2", phone: "+15552222222", name: "Bob" },
              ],
            }),
        });
      }
      // PATCH calls
      if (opts?.method === "PATCH") {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: true });
    });

    mockSendSms
      .mockResolvedValueOnce({ success: true, messageId: "msg-1" })
      .mockResolvedValueOnce({ success: false, error: "rate limited" });

    const result = await processReminders(config);
    expect(result).toEqual({ sent: 1, failed: 1 });
    expect(mockSendSms).toHaveBeenCalledTimes(2);
  });
});
