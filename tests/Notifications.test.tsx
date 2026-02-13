import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./testHelpers";
import Notifications from "../src/pages/Notifications";

/* ------------------------------------------------------------------ */
/*  Mocks                                                              */
/* ------------------------------------------------------------------ */

let mockLoggedIn = true;

const mockList = vi.fn();
const mockUpdate = vi.fn();

vi.mock("../src/lib/ayb", () => ({
  ayb: {
    records: {
      list: (...args: unknown[]) => mockList(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    realtime: {
      subscribe: vi.fn(() => () => {}),
    },
  },
  isLoggedIn: () => mockLoggedIn,
  currentUserId: () => "test-user-id",
}));

const mockRpc = vi.fn();
vi.mock("../src/lib/rpc", () => ({
  rpc: (...args: unknown[]) => mockRpc(...args),
}));

vi.mock("../src/lib/reminders", () => ({
  scheduleReminders: vi.fn().mockResolvedValue(undefined),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

/* ------------------------------------------------------------------ */
/*  Test data                                                          */
/* ------------------------------------------------------------------ */

const ITEMS = [
  { id: "item-1", library_id: "lib-1", name: "Circular Saw", status: "borrowed" },
  { id: "item-2", library_id: "lib-1", name: "Drill Press", status: "borrowed" },
  { id: "item-3", library_id: "lib-1", name: "Sander", status: "borrowed" },
];

const LIBRARIES = [
  { id: "lib-1", name: "Workshop Tools", slug: "workshop", is_public: true },
];

const BORROWERS = [
  { id: "bor-1", name: "Alice Johnson", phone: "+15551111111" },
  { id: "bor-2", name: "Bob Smith", phone: "+15552222222" },
];

const PENDING_REQUEST = {
  id: "req-1",
  item_id: "item-1",
  borrower_id: "bor-1",
  message: "Would love to borrow this!",
  status: "pending" as const,
  return_by: new Date(Date.now() + 7 * 86400000).toISOString(),
  private_possession: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const OVERDUE_LOAN = {
  id: "loan-1",
  item_id: "item-2",
  borrower_id: "bor-2",
  request_id: "req-old",
  borrowed_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  return_by: new Date(Date.now() - 5 * 86400000).toISOString(), // 5 days overdue
  returned_at: null,
  status: "late" as const,
  notes: null,
  private_possession: false,
  created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  updated_at: new Date().toISOString(),
};

const ACTIVE_LOAN = {
  id: "loan-2",
  item_id: "item-3",
  borrower_id: "bor-1",
  request_id: "req-old-2",
  borrowed_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  return_by: new Date(Date.now() + 4 * 86400000).toISOString(), // due in 4 days
  returned_at: null,
  status: "active" as const,
  notes: null,
  private_possession: false,
  created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  updated_at: new Date().toISOString(),
};

/* ------------------------------------------------------------------ */
/*  Setup helpers                                                      */
/* ------------------------------------------------------------------ */

/**
 * Sets up mockList for the sequential loading pattern:
 * libraries (empty) → early return (no items/requests/loans fetched).
 */
function setupEmpty() {
  // Step 1: libraries — empty → triggers early return
  mockList.mockResolvedValueOnce({ items: [] });
}

/**
 * Sets up mockList for the sequential loading pattern:
 * libraries → items → requests+loans (parallel) → borrowers.
 */
function setupWithData() {
  // Step 1: libraries
  mockList.mockResolvedValueOnce({ items: LIBRARIES });
  // Step 2: items
  mockList.mockResolvedValueOnce({ items: ITEMS });
  // Step 3: borrow_requests + loans (parallel)
  mockList.mockResolvedValueOnce({ items: [PENDING_REQUEST] });
  mockList.mockResolvedValueOnce({ items: [OVERDUE_LOAN, ACTIVE_LOAN] });
  // Step 4: borrowers
  mockList.mockResolvedValueOnce({ items: BORROWERS });
}

/**
 * Sets up data with only pending requests (no loans).
 * Sequential: libraries → items → requests+loans → borrowers.
 */
function setupWithRequestsOnly() {
  mockList.mockResolvedValueOnce({ items: LIBRARIES }); // libraries
  mockList.mockResolvedValueOnce({ items: ITEMS }); // items
  mockList.mockResolvedValueOnce({ items: [PENDING_REQUEST] }); // requests
  mockList.mockResolvedValueOnce({ items: [] }); // loans
  mockList.mockResolvedValueOnce({ items: BORROWERS }); // borrowers
}

/**
 * Sets up data with only loans (no pending requests).
 * Sequential: libraries → items → requests+loans → borrowers.
 */
function setupWithLoansOnly() {
  mockList.mockResolvedValueOnce({ items: LIBRARIES }); // libraries
  mockList.mockResolvedValueOnce({ items: ITEMS }); // items
  mockList.mockResolvedValueOnce({ items: [] }); // requests (empty)
  mockList.mockResolvedValueOnce({ items: [OVERDUE_LOAN, ACTIVE_LOAN] }); // loans
  mockList.mockResolvedValueOnce({ items: BORROWERS }); // borrowers
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe("Notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoggedIn = true;
  });

  /* ---- Auth guard ---- */

  it("redirects to login when not logged in", () => {
    mockLoggedIn = false;
    // Still need to mock list to avoid errors (loadAll won't be called, but provide defaults)
    mockList.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<Notifications />);

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  /* ---- Loading state ---- */

  it("renders loading skeleton with shimmer elements", () => {
    mockList.mockReturnValue(new Promise(() => {})); // never resolves

    renderWithProviders(<Notifications />);

    const skeleton = screen.getByLabelText("Loading notifications");
    expect(skeleton).toBeInTheDocument();
    // Verify actual skeleton shimmer elements render
    const shimmers = skeleton.querySelectorAll(".skeleton-shimmer");
    expect(shimmers.length).toBeGreaterThanOrEqual(3);
  });

  /* ---- Empty state ---- */

  it("renders empty state 'All caught up!' when no requests or loans", async () => {
    setupEmpty();

    renderWithProviders(<Notifications />);

    expect(
      await screen.findByText(/All caught up! No pending requests or overdue items\./),
    ).toBeInTheDocument();
  });

  /* ---- Pending requests ---- */

  it("renders pending requests with borrower name, item name, Approve and Decline buttons", async () => {
    setupWithRequestsOnly();

    renderWithProviders(<Notifications />);

    // Section heading
    expect(await screen.findByText("Pending Requests")).toBeInTheDocument();

    // Borrower name
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();

    // "wants to borrow" text
    expect(screen.getByText("wants to borrow")).toBeInTheDocument();

    // Item name
    expect(screen.getByText("Circular Saw")).toBeInTheDocument();

    // Request message
    expect(screen.getByText(/"Would love to borrow this!"/)).toBeInTheDocument();

    // Buttons
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
  });

  /* ---- Approve flow ---- */

  it("Approve button calls rpc('approve_borrow') and shows 'Request approved' toast", async () => {
    setupWithRequestsOnly();
    mockRpc.mockResolvedValueOnce({ id: "loan-new", status: "active" });

    renderWithProviders(<Notifications />);

    const approveBtn = await screen.findByRole("button", { name: "Approve" });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("approve_borrow", {
        p_request_id: "req-1",
        p_return_by: expect.any(String),
      });
    });

    // Success toast
    expect(await screen.findByText("Request approved")).toBeInTheDocument();
    expect(screen.getByText("The borrower will be notified.")).toBeInTheDocument();
  });

  /* ---- Decline flow ---- */

  it("Decline button opens confirm dialog, declining removes request and shows toast", async () => {
    setupWithRequestsOnly();
    mockUpdate.mockResolvedValueOnce({});

    renderWithProviders(<Notifications />);

    const declineBtn = await screen.findByRole("button", { name: "Decline" });
    fireEvent.click(declineBtn);

    // Confirm dialog should open
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Decline Request")).toBeInTheDocument();
    expect(screen.getByText(/Decline this borrow request from Alice Johnson\?/)).toBeInTheDocument();

    // Click the Decline button inside the dialog
    const dialogDeclineBtn = screen.getAllByRole("button", { name: "Decline" });
    // The last one is in the dialog
    fireEvent.click(dialogDeclineBtn[dialogDeclineBtn.length - 1]);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith("borrow_requests", "req-1", { status: "declined" });
    });

    // Success toast
    expect(await screen.findByText("Request declined")).toBeInTheDocument();
  });

  /* ---- Overdue loans ---- */

  it("renders overdue loans with highlighting and day count", async () => {
    setupWithLoansOnly();

    renderWithProviders(<Notifications />);

    // Section heading
    expect(await screen.findByText("Overdue")).toBeInTheDocument();

    // Item name in overdue section
    expect(screen.getByText("Drill Press")).toBeInTheDocument();

    // Borrower name
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();

    // Day count — 5 days overdue
    expect(screen.getByText(/5 days overdue/)).toBeInTheDocument();

    // Mark Returned button present
    const returnBtns = screen.getAllByRole("button", { name: "Mark Returned" });
    expect(returnBtns.length).toBeGreaterThanOrEqual(1);
  });

  /* ---- Active (non-overdue) loans ---- */

  it("renders active (non-overdue) loans with due dates", async () => {
    setupWithLoansOnly();

    renderWithProviders(<Notifications />);

    // Section heading for active loans
    expect(await screen.findByText("Currently Borrowed")).toBeInTheDocument();

    // Item name in active section
    expect(screen.getByText("Sander")).toBeInTheDocument();

    // Borrower name
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();

    // Due date — "Due in 4 days"
    expect(screen.getByText(/Due in 4 day/)).toBeInTheDocument();
  });

  /* ---- Mark Returned flow ---- */

  it("Mark Returned opens confirm dialog, rpc('return_item') called on confirm, shows toast", async () => {
    setupWithLoansOnly();
    mockRpc.mockResolvedValueOnce({});

    renderWithProviders(<Notifications />);

    // Wait for data to load, then click the first Mark Returned (overdue loan)
    const returnBtns = await screen.findAllByRole("button", { name: "Mark Returned" });
    fireEvent.click(returnBtns[0]);

    // Confirm dialog
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Mark as Returned")).toBeInTheDocument();
    expect(screen.getByText(/Mark "Drill Press" as returned\?/)).toBeInTheDocument();

    // Click the Mark Returned button in the dialog
    const allReturnBtns = screen.getAllByRole("button", { name: "Mark Returned" });
    fireEvent.click(allReturnBtns[allReturnBtns.length - 1]);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("return_item", { p_loan_id: "loan-1" });
    });

    // Success toast
    expect(await screen.findByText("Item marked as returned")).toBeInTheDocument();
  });

  /* ---- Back link ---- */

  it("back link to dashboard exists", async () => {
    setupEmpty();

    renderWithProviders(<Notifications />);

    // Wait for loading to finish
    await screen.findByText(/All caught up/);

    const dashLink = screen.getByText("Dashboard", { exact: false });
    expect(dashLink).toBeInTheDocument();
    expect(dashLink.closest("a")).toHaveAttribute("href", "/dashboard");
  });

  /* ---- Error handling ---- */

  it("shows error toast when loadAll fails", async () => {
    mockList.mockRejectedValue(new Error("Failed to fetch"));

    renderWithProviders(<Notifications />);

    expect(await screen.findByText("Couldn't load notifications")).toBeInTheDocument();
  });

  it("shows error toast when approve fails", async () => {
    setupWithRequestsOnly();
    mockRpc.mockRejectedValueOnce(new Error("RPC approve_borrow failed"));

    renderWithProviders(<Notifications />);

    const approveBtn = await screen.findByRole("button", { name: "Approve" });
    fireEvent.click(approveBtn);

    expect(await screen.findByText("Couldn't approve request")).toBeInTheDocument();
  });

  it("shows error toast when decline fails", async () => {
    setupWithRequestsOnly();
    mockUpdate.mockRejectedValueOnce(new Error("Server error"));

    renderWithProviders(<Notifications />);

    const declineBtn = await screen.findByRole("button", { name: "Decline" });
    fireEvent.click(declineBtn);

    // Confirm in dialog
    const dialogDeclineBtn = await screen.findAllByRole("button", { name: "Decline" });
    fireEvent.click(dialogDeclineBtn[dialogDeclineBtn.length - 1]);

    expect(await screen.findByText("Couldn't decline request")).toBeInTheDocument();
  });

  it("shows error toast when return_item fails", async () => {
    setupWithLoansOnly();
    mockRpc.mockRejectedValueOnce(new Error("RPC return_item failed"));

    renderWithProviders(<Notifications />);

    const returnBtns = await screen.findAllByRole("button", { name: "Mark Returned" });
    fireEvent.click(returnBtns[0]);

    // Confirm in dialog
    const allReturnBtns = await screen.findAllByRole("button", { name: "Mark Returned" });
    fireEvent.click(allReturnBtns[allReturnBtns.length - 1]);

    expect(await screen.findByText("Couldn't mark as returned")).toBeInTheDocument();
  });

  /* ---- Full data rendering ---- */

  it("renders all sections together when requests and loans both exist", async () => {
    setupWithData();

    renderWithProviders(<Notifications />);

    // All three sections should be visible
    expect(await screen.findByText("Pending Requests")).toBeInTheDocument();
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.getByText("Currently Borrowed")).toBeInTheDocument();

    // Pending request count badge
    const pendingBadge = screen.getByText("1", { selector: ".badge-pending" });
    expect(pendingBadge).toBeInTheDocument();

    // Overdue count badge
    const overdueBadge = screen.getByText("1", { selector: ".badge-late" });
    expect(overdueBadge).toBeInTheDocument();

    // Active loan count badge
    const activeBadge = screen.getByText("1", { selector: ".badge-borrowed" });
    expect(activeBadge).toBeInTheDocument();
  });

  /* ---- Approve removes request from list ---- */

  it("removes approved request from the pending list", async () => {
    setupWithRequestsOnly();
    mockRpc.mockResolvedValueOnce({ id: "loan-new", status: "active" });

    renderWithProviders(<Notifications />);

    // Request is visible
    expect(await screen.findByText("Alice Johnson")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    // After approve, the request should be gone and empty state shown
    await waitFor(() => {
      expect(screen.queryByText("Pending Requests")).not.toBeInTheDocument();
    });
  });

  /* ---- Mark Returned removes loan from list ---- */

  it("removes returned loan from the list after confirm", async () => {
    // Only one overdue loan, no active loans, no requests
    // Sequential: libraries → items → requests+loans → borrowers
    mockList.mockResolvedValueOnce({ items: LIBRARIES }); // libraries
    mockList.mockResolvedValueOnce({ items: ITEMS }); // items
    mockList.mockResolvedValueOnce({ items: [] }); // requests (empty)
    mockList.mockResolvedValueOnce({ items: [OVERDUE_LOAN] }); // loans — just the overdue one
    mockList.mockResolvedValueOnce({ items: BORROWERS }); // borrowers
    mockRpc.mockResolvedValueOnce({});

    renderWithProviders(<Notifications />);

    expect(await screen.findByText("Drill Press")).toBeInTheDocument();

    const returnBtn = screen.getByRole("button", { name: "Mark Returned" });
    fireEvent.click(returnBtn);

    // Confirm
    const allReturnBtns = await screen.findAllByRole("button", { name: "Mark Returned" });
    fireEvent.click(allReturnBtns[allReturnBtns.length - 1]);

    // After return, overdue section should disappear and empty state should show
    await waitFor(() => {
      expect(screen.queryByText("Overdue")).not.toBeInTheDocument();
    });

    expect(screen.getByText(/All caught up/)).toBeInTheDocument();
  });
});
