import { screen } from "@testing-library/react";
import { renderWithProviders } from "./testHelpers";
import BorrowConfirmation from "../src/pages/BorrowConfirmation";

// Mock react-router-dom useParams
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ requestId: "test-id" }),
  };
});

const mockGet = vi.fn();

vi.mock("../src/lib/ayb", () => ({
  ayb: {
    records: {
      get: (...args: unknown[]) => mockGet(...args),
    },
  },
}));

function renderConfirmation() {
  return renderWithProviders(<BorrowConfirmation />);
}

describe("BorrowConfirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders skeleton loading state initially", () => {
    // Never resolving promise — stays in loading
    mockGet.mockReturnValue(new Promise(() => {}));
    renderConfirmation();
    expect(screen.getByLabelText("Loading request")).toBeInTheDocument();
  });

  it("renders pending request status", async () => {
    mockGet
      .mockResolvedValueOnce({
        id: "test-id",
        item_id: "item-1",
        borrower_id: "borrower-1",
        status: "pending",
        created_at: "2026-01-01T00:00:00Z",
      })
      .mockResolvedValueOnce({
        id: "item-1",
        name: "Cordless Drill",
        status: "available",
      });

    renderConfirmation();

    expect(await screen.findByText("Request Sent!")).toBeInTheDocument();
    expect(screen.getByText(/Cordless Drill/)).toBeInTheDocument();
    expect(screen.getByText(/You'll get a text message/)).toBeInTheDocument();
  });

  it("renders approved request status", async () => {
    mockGet
      .mockResolvedValueOnce({
        id: "test-id",
        item_id: "item-1",
        borrower_id: "borrower-1",
        status: "approved",
        created_at: "2026-01-01T00:00:00Z",
      })
      .mockResolvedValueOnce({
        id: "item-1",
        name: "Table Saw",
        status: "borrowed",
      });

    renderConfirmation();

    expect(await screen.findByText("Request Approved!")).toBeInTheDocument();
    expect(screen.getByText(/Table Saw/)).toBeInTheDocument();
  });

  it("renders declined request status", async () => {
    mockGet
      .mockResolvedValueOnce({
        id: "test-id",
        item_id: "item-1",
        borrower_id: "borrower-1",
        status: "declined",
        created_at: "2026-01-01T00:00:00Z",
      })
      .mockResolvedValueOnce({
        id: "item-1",
        name: "Hammer",
        status: "available",
      });

    renderConfirmation();

    expect(await screen.findByText("Request Declined")).toBeInTheDocument();
    expect(screen.getByText(/Hammer/)).toBeInTheDocument();
  });

  it("renders back link to home", async () => {
    mockGet
      .mockResolvedValueOnce({
        id: "test-id",
        item_id: "item-1",
        borrower_id: "borrower-1",
        status: "pending",
        created_at: "2026-01-01T00:00:00Z",
      })
      .mockResolvedValueOnce({
        id: "item-1",
        name: "Drill",
        status: "available",
      });

    renderConfirmation();

    const link = await screen.findByText("Back to Shareborough");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/");
  });
});
