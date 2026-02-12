import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./testHelpers";
import Dashboard from "../src/pages/Dashboard";

const mockList = vi.fn();

vi.mock("../src/lib/ayb", () => ({
  ayb: {
    records: {
      list: (...args: unknown[]) => mockList(...args),
    },
    realtime: {
      subscribe: vi.fn(() => () => {}),
    },
  },
  isLoggedIn: () => true,
}));

const mockRpc = vi.fn();
vi.mock("../src/lib/rpc", () => ({
  rpc: (...args: unknown[]) => mockRpc(...args),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function setupEmptyDashboard() {
  // libraries
  mockList.mockResolvedValueOnce({ items: [] });
  // active loans
  mockList.mockResolvedValueOnce({ items: [] });
  // all loans (for stats)
  mockList.mockResolvedValueOnce({ items: [] });
  // items
  mockList.mockResolvedValueOnce({ items: [] });
}

function setupDashboardWithData() {
  // libraries
  mockList.mockResolvedValueOnce({
    items: [
      {
        id: "lib-1",
        name: "Power Tools",
        slug: "power-tools-abc1",
        description: "My tools",
        is_public: true,
      },
    ],
  });
  // active loans
  mockList.mockResolvedValueOnce({
    items: [
      {
        id: "loan-1",
        item_id: "item-2",
        borrower_id: "bor-2",
        status: "active",
        return_by: new Date(Date.now() + 3 * 86400000).toISOString(), // 3 days from now
      },
    ],
  });
  // all loans (for stats)
  mockList.mockResolvedValueOnce({
    items: [
      {
        id: "loan-1",
        item_id: "item-2",
        borrower_id: "bor-2",
        status: "active",
      },
      {
        id: "loan-old",
        item_id: "item-1",
        borrower_id: "bor-1",
        status: "returned",
      },
    ],
  });
  // items
  mockList.mockResolvedValueOnce({
    items: [
      { id: "item-1", library_id: "lib-1", name: "Drill", status: "available" },
      { id: "item-2", library_id: "lib-1", name: "Saw", status: "borrowed" },
    ],
  });
  // borrowers (loaded after items because of borrower IDs)
  mockList.mockResolvedValueOnce({
    items: [
      { id: "bor-1", name: "Alice", phone: "+15551111111" },
      { id: "bor-2", name: "Bob", phone: "+15552222222" },
    ],
  });
}

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders skeleton loading state initially", () => {
    mockList.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<Dashboard />);

    expect(screen.getByLabelText("Loading dashboard")).toBeInTheDocument();
  });

  it("renders empty state with create prompt", async () => {
    setupEmptyDashboard();

    renderWithProviders(<Dashboard />);

    expect(await screen.findByText("No libraries yet. Create one to start lending!")).toBeInTheDocument();
    expect(screen.getByText("Create Your First Library")).toBeInTheDocument();
  });

  it("renders libraries and active loans", async () => {
    setupDashboardWithData();

    renderWithProviders(<Dashboard />);

    // Library
    expect(await screen.findByText("Power Tools")).toBeInTheDocument();

    // Active loan
    expect(screen.getByText("Currently Borrowed")).toBeInTheDocument();
    expect(screen.getByText("Saw")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Mark Returned")).toBeInTheDocument();
  });

  it("shows overdue highlighting for late loans", async () => {
    // libraries
    mockList.mockResolvedValueOnce({ items: [] });
    // loans — one overdue
    mockList.mockResolvedValueOnce({
      items: [
        {
          id: "loan-1",
          item_id: "item-1",
          borrower_id: "bor-1",
          status: "late",
          return_by: new Date(Date.now() - 3 * 86400000).toISOString(), // 3 days ago
        },
      ],
    });
    // all loans (for stats)
    mockList.mockResolvedValueOnce({
      items: [
        {
          id: "loan-1",
          item_id: "item-1",
          borrower_id: "bor-1",
          status: "late",
        },
      ],
    });
    // items
    mockList.mockResolvedValueOnce({
      items: [{ id: "item-1", library_id: "lib-1", name: "Overdue Drill", status: "borrowed" }],
    });
    // borrowers
    mockList.mockResolvedValueOnce({
      items: [{ id: "bor-1", name: "Late Larry", phone: "+15553333333" }],
    });

    renderWithProviders(<Dashboard />);

    expect(await screen.findByText("Overdue Drill")).toBeInTheDocument();
    expect(screen.getByText(/3 days overdue/)).toBeInTheDocument();
    expect(screen.getByText("Late")).toBeInTheDocument();
  });

  it("shows library stats with lent count and friends helped", async () => {
    setupDashboardWithData();

    renderWithProviders(<Dashboard />);

    // Library card should show stats: 2 loans total (2 lent), 2 unique borrowers (2 friends)
    expect(await screen.findByText("Power Tools")).toBeInTheDocument();
    expect(screen.getByTestId("stat-lent")).toHaveTextContent("2 lent");
    expect(screen.getByTestId("stat-friends")).toHaveTextContent("2 friends helped");
  });

  it("does not show stats when library has no loans", async () => {
    // libraries
    mockList.mockResolvedValueOnce({
      items: [
        {
          id: "lib-1",
          name: "Empty Library",
          slug: "empty-lib",
          description: null,
          is_public: false,
        },
      ],
    });
    // active loans
    mockList.mockResolvedValueOnce({ items: [] });
    // all loans (for stats) — none
    mockList.mockResolvedValueOnce({ items: [] });
    // items
    mockList.mockResolvedValueOnce({
      items: [{ id: "item-1", library_id: "lib-1", name: "Untouched Item", status: "available" }],
    });

    renderWithProviders(<Dashboard />);

    expect(await screen.findByText("Empty Library")).toBeInTheDocument();
    expect(screen.queryByTestId("stat-lent")).not.toBeInTheDocument();
    expect(screen.queryByTestId("stat-friends")).not.toBeInTheDocument();
  });

  it("shows singular 'friend' when only one borrower", async () => {
    // libraries
    mockList.mockResolvedValueOnce({
      items: [
        { id: "lib-1", name: "Solo Library", slug: "solo", description: null, is_public: true },
      ],
    });
    // active loans
    mockList.mockResolvedValueOnce({ items: [] });
    // all loans — 2 loans but same borrower
    mockList.mockResolvedValueOnce({
      items: [
        { id: "loan-1", item_id: "item-1", borrower_id: "bor-1", status: "returned" },
        { id: "loan-2", item_id: "item-2", borrower_id: "bor-1", status: "returned" },
      ],
    });
    // items
    mockList.mockResolvedValueOnce({
      items: [
        { id: "item-1", library_id: "lib-1", name: "Item A", status: "available" },
        { id: "item-2", library_id: "lib-1", name: "Item B", status: "available" },
      ],
    });
    // borrowers (bor-1 from allLoans)
    mockList.mockResolvedValueOnce({
      items: [{ id: "bor-1", name: "Solo Friend", phone: "+15551111111" }],
    });

    renderWithProviders(<Dashboard />);

    expect(await screen.findByText("Solo Library")).toBeInTheDocument();
    expect(screen.getByTestId("stat-lent")).toHaveTextContent("2 lent");
    expect(screen.getByTestId("stat-friends")).toHaveTextContent("1 friend helped");
  });

  it("calls return_item rpc on Mark Returned after dialog confirmation", async () => {
    setupDashboardWithData();
    mockRpc.mockResolvedValue({});
    // After return, loadAll is called
    setupEmptyDashboard();

    renderWithProviders(<Dashboard />);

    // Click Mark Returned — opens ConfirmDialog
    fireEvent.click(await screen.findByText("Mark Returned"));

    // Confirm in dialog
    const confirmBtns = await screen.findAllByRole("button", { name: "Mark Returned" });
    fireEvent.click(confirmBtns[confirmBtns.length - 1]);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("return_item", { p_loan_id: "loan-1" });
    });
  });
});
