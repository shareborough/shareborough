import type {
  Library,
  Item,
  FacetDefinition,
  Borrower,
  BorrowRequest,
  Loan,
} from "../src/types";

describe("Types", () => {
  it("Library type has required fields", () => {
    const lib: Library = {
      id: "1",
      owner_id: "user1",
      name: "Power Tools",
      slug: "power-tools-abc1",
      description: "My collection of power tools",
      cover_photo: null,
      is_public: true,
      show_borrower_names: false,
      show_return_dates: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    expect(lib.name).toBe("Power Tools");
    expect(lib.is_public).toBe(true);
  });

  it("Item type has status enum values", () => {
    const available: Item = {
      id: "1",
      library_id: "lib1",
      name: "Drill",
      description: "Cordless drill",
      photo_url: "/photos/drill.jpg",
      status: "available",
      max_borrow_days: null,
      visibility: "public",
      circle_id: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    expect(available.status).toBe("available");

    const borrowed: Item = { ...available, status: "borrowed" };
    expect(borrowed.status).toBe("borrowed");
  });

  it("FacetDefinition supports all types", () => {
    const text: FacetDefinition = {
      id: "1",
      library_id: "lib1",
      name: "Genre",
      facet_type: "text",
      options: ["Fiction", "Non-fiction"],
      position: 0,
      created_at: "2026-01-01T00:00:00Z",
    };
    expect(text.facet_type).toBe("text");
    expect(text.options).toHaveLength(2);

    const num: FacetDefinition = { ...text, facet_type: "number", options: null };
    expect(num.facet_type).toBe("number");
  });

  it("Borrower does not require user_id", () => {
    const borrower: Borrower = {
      id: "1",
      phone: "+15551234567",
      name: "Alice",
      user_id: null,
      created_at: "2026-01-01T00:00:00Z",
    };
    expect(borrower.user_id).toBeNull();
    expect(borrower.phone).toBeTruthy();
  });

  it("BorrowRequest has correct status values", () => {
    const req: BorrowRequest = {
      id: "1",
      item_id: "item1",
      borrower_id: "bor1",
      message: "Can I borrow this for the weekend?",
      status: "pending",
      return_by: null,
      private_possession: false,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    expect(req.status).toBe("pending");
  });

  it("Loan tracks return dates and status", () => {
    const loan: Loan = {
      id: "1",
      item_id: "item1",
      borrower_id: "bor1",
      request_id: "req1",
      borrowed_at: "2026-01-01T00:00:00Z",
      return_by: "2026-01-15T00:00:00Z",
      returned_at: null,
      status: "active",
      notes: null,
      private_possession: false,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    expect(loan.status).toBe("active");
    expect(loan.returned_at).toBeNull();
    expect(loan.return_by).toBeTruthy();
  });
});
