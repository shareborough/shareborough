vi.mock("../src/lib/ayb", () => ({
  ayb: { token: "test-token-123" },
}));

import { rpc } from "../src/lib/rpc";

describe("rpc", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockResponse(overrides: Partial<Response> & { json?: () => Promise<unknown>; text?: () => Promise<string> }) {
    return {
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
      ...overrides,
    } as unknown as Response;
  }

  it("calls the correct RPC endpoint with POST", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({ json: () => Promise.resolve({ id: "loan-1" }) }),
    );

    await rpc("approve_borrow", { p_request_id: "req-1" });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/rpc/approve_borrow"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ p_request_id: "req-1" }),
      }),
    );
  });

  it("includes auth token in header when logged in", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse({}));

    await rpc("approve_borrow", {});

    const callArgs = vi.mocked(globalThis.fetch).mock.calls[0];
    const options = callArgs[1] as RequestInit;
    const headers = options.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer test-token-123");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("returns parsed JSON on success", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({ json: () => Promise.resolve({ id: "loan-1", status: "active" }) }),
    );

    const result = await rpc<{ id: string; status: string }>("approve_borrow", {});
    expect(result.id).toBe("loan-1");
    expect(result.status).toBe("active");
  });

  it("returns undefined for 204 No Content", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({ status: 204, headers: new Headers() }),
    );

    const result = await rpc("return_item", { p_loan_id: "loan-1" });
    expect(result).toBeUndefined();
  });

  it("throws with server error message from JSON body", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify({ message: "Item is not available for borrowing" })),
      }),
    );

    await expect(rpc("request_borrow", {})).rejects.toThrow(
      "Item is not available for borrowing",
    );
  });

  it("throws with plain text error on failure", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal server error"),
      }),
    );

    await expect(rpc("bad_function", {})).rejects.toThrow(
      "Internal server error",
    );
  });

  it("throws generic message when error has no body", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: false,
        status: 500,
        text: () => Promise.resolve(""),
      }),
    );

    await expect(rpc("bad_function", {})).rejects.toThrow(
      "RPC bad_function failed",
    );
  });
});
