const mockRpc = vi.fn();
const mockGet = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockList = vi.fn();

vi.mock("../src/lib/rpc", () => ({
  rpc: (...args: unknown[]) => mockRpc(...args),
}));

vi.mock("../src/lib/ayb", () => ({
  ayb: {
    records: {
      get: (...args: unknown[]) => mockGet(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      list: (...args: unknown[]) => mockList(...args),
    },
  },
}));

import { requestBorrow } from "../src/lib/borrow";

const baseParams = {
  itemId: "item-1",
  name: "Alice",
  phone: "+15551234567",
  message: "Can I borrow this?",
  returnBy: "2026-03-01",
  privatePossession: false,
};

describe("requestBorrow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- RPC path ---

  it("returns RPC result when RPC succeeds", async () => {
    const rpcResult = { id: "req-1", item_id: "item-1", status: "pending" };
    mockRpc.mockResolvedValue(rpcResult);

    const result = await requestBorrow(baseParams);

    expect(mockRpc).toHaveBeenCalledWith("request_borrow", {
      p_item_id: "item-1",
      p_borrower_name: "Alice",
      p_borrower_phone: "+15551234567",
      p_message: "Can I borrow this?",
      p_return_by: "2026-03-01",
      p_private_possession: false,
    });
    expect(result).toBe(rpcResult);
    // Should NOT fall through to CRUD
    expect(mockGet).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockList).not.toHaveBeenCalled();
  });

  // --- CRUD fallback path ---

  it("falls back to CRUD when RPC fails", async () => {
    mockRpc.mockRejectedValue(new Error("Unauthorized"));
    mockGet.mockResolvedValue({ id: "item-1", status: "available" });
    mockCreate
      .mockResolvedValueOnce({ id: "borrower-1", phone: "+15551234567", name: "Alice" }) // borrower
      .mockResolvedValueOnce({ id: "req-1", item_id: "item-1", status: "pending" }); // request

    const result = await requestBorrow(baseParams);

    expect(mockGet).toHaveBeenCalledWith("items", "item-1");
    expect(mockCreate).toHaveBeenCalledWith("borrowers", {
      phone: "+15551234567",
      name: "Alice",
    });
    expect(mockCreate).toHaveBeenCalledWith("borrow_requests", {
      item_id: "item-1",
      borrower_id: "borrower-1",
      message: "Can I borrow this?",
      return_by: "2026-03-01",
      private_possession: false,
    });
    expect(result.id).toBe("req-1");
  });

  it("throws when item is not available", async () => {
    mockRpc.mockRejectedValue(new Error("Unauthorized"));
    mockGet.mockResolvedValue({ id: "item-1", status: "borrowed" });

    await expect(requestBorrow(baseParams)).rejects.toThrow(
      "Item is not available for borrowing",
    );
  });

  it("looks up existing borrower when create fails (phone conflict)", async () => {
    mockRpc.mockRejectedValue(new Error("Unauthorized"));
    mockGet.mockResolvedValue({ id: "item-1", status: "available" });
    mockCreate
      .mockRejectedValueOnce(new Error("unique constraint")) // borrower create fails
      .mockResolvedValueOnce({ id: "req-1", status: "pending" }); // request create succeeds
    mockList.mockResolvedValue({
      items: [{ id: "borrower-existing", phone: "+15551234567", name: "Alice" }],
    });

    await requestBorrow(baseParams);

    expect(mockList).toHaveBeenCalledWith("borrowers", {
      filter: "phone='+15551234567'",
      perPage: 1,
    });
    expect(mockCreate).toHaveBeenCalledWith("borrow_requests", expect.objectContaining({
      borrower_id: "borrower-existing",
    }));
  });

  it("updates borrower name if different from existing", async () => {
    mockRpc.mockRejectedValue(new Error("Unauthorized"));
    mockGet.mockResolvedValue({ id: "item-1", status: "available" });
    mockCreate
      .mockRejectedValueOnce(new Error("unique constraint")) // borrower create fails
      .mockResolvedValueOnce({ id: "req-1", status: "pending" }); // request create
    mockList.mockResolvedValue({
      items: [{ id: "borrower-existing", phone: "+15551234567", name: "Old Name" }],
    });
    mockUpdate.mockResolvedValue({ id: "borrower-existing", name: "Alice" });

    await requestBorrow(baseParams);

    expect(mockUpdate).toHaveBeenCalledWith("borrowers", "borrower-existing", {
      name: "Alice",
    });
  });

  it("does not update borrower name if same", async () => {
    mockRpc.mockRejectedValue(new Error("Unauthorized"));
    mockGet.mockResolvedValue({ id: "item-1", status: "available" });
    mockCreate
      .mockRejectedValueOnce(new Error("unique constraint"))
      .mockResolvedValueOnce({ id: "req-1", status: "pending" });
    mockList.mockResolvedValue({
      items: [{ id: "borrower-existing", phone: "+15551234567", name: "Alice" }],
    });

    await requestBorrow(baseParams);

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("throws when borrower create fails and lookup returns empty", async () => {
    mockRpc.mockRejectedValue(new Error("Unauthorized"));
    mockGet.mockResolvedValue({ id: "item-1", status: "available" });
    mockCreate.mockRejectedValueOnce(new Error("unique constraint"));
    mockList.mockResolvedValue({ items: [] });

    await expect(requestBorrow(baseParams)).rejects.toThrow(
      "Failed to create borrower record",
    );
  });

  it("passes null message and returnBy correctly", async () => {
    mockRpc.mockRejectedValue(new Error("Unauthorized"));
    mockGet.mockResolvedValue({ id: "item-1", status: "available" });
    mockCreate
      .mockResolvedValueOnce({ id: "borrower-1", phone: "+15551234567", name: "Alice" })
      .mockResolvedValueOnce({ id: "req-1", status: "pending" });

    await requestBorrow({ ...baseParams, message: null, returnBy: null });

    expect(mockCreate).toHaveBeenCalledWith("borrow_requests", expect.objectContaining({
      message: null,
      return_by: null,
    }));
  });

  it("passes privatePossession=true to borrow request", async () => {
    mockRpc.mockRejectedValue(new Error("Unauthorized"));
    mockGet.mockResolvedValue({ id: "item-1", status: "available" });
    mockCreate
      .mockResolvedValueOnce({ id: "borrower-1", phone: "+15551234567", name: "Alice" })
      .mockResolvedValueOnce({ id: "req-1", status: "pending" });

    await requestBorrow({ ...baseParams, privatePossession: true });

    expect(mockCreate).toHaveBeenCalledWith("borrow_requests", expect.objectContaining({
      private_possession: true,
    }));
  });
});
