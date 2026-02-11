import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./testHelpers";
import PublicItem from "../src/pages/PublicItem";

const mockList = vi.fn();
const mockGet = vi.fn();

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ slug: "power-tools", itemId: "item-1" }),
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../src/lib/ayb", () => ({
  ayb: {
    records: {
      list: (...args: unknown[]) => mockList(...args),
      get: (...args: unknown[]) => mockGet(...args),
    },
  },
}));

const mockRequestBorrow = vi.fn();
vi.mock("../src/lib/borrow", () => ({
  requestBorrow: (...args: unknown[]) => mockRequestBorrow(...args),
}));

describe("PublicItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupMocksForItem(item: Record<string, unknown>) {
    // library lookup
    mockList.mockResolvedValueOnce({
      items: [{ id: "lib-1", name: "Power Tools", slug: "power-tools", is_public: true }],
    });
    // item get
    mockGet.mockResolvedValueOnce(item);
    // facet defs
    mockList.mockResolvedValueOnce({ items: [] });
    // facet values
    mockList.mockResolvedValueOnce({ items: [] });
  }

  it("renders skeleton loading state initially", () => {
    mockList.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<PublicItem />);

    expect(screen.getByLabelText("Loading item")).toBeInTheDocument();
  });

  it("renders not-found when item doesn't exist", async () => {
    mockList.mockResolvedValueOnce({ items: [] });

    renderWithProviders(<PublicItem />);

    expect(await screen.findByText("Item not found")).toBeInTheDocument();
  });

  it("renders available item with Borrow This button", async () => {
    setupMocksForItem({
      id: "item-1",
      library_id: "lib-1",
      name: "Cordless Drill",
      description: "18V Milwaukee",
      status: "available",
      photo_url: null,
    });

    renderWithProviders(<PublicItem />);

    expect(await screen.findByText("Cordless Drill")).toBeInTheDocument();
    expect(screen.getByText("18V Milwaukee")).toBeInTheDocument();
    expect(screen.getByText("Borrow This")).toBeInTheDocument();
  });

  it("shows borrowed-status message instead of borrow button", async () => {
    setupMocksForItem({
      id: "item-1",
      library_id: "lib-1",
      name: "Hammer",
      description: null,
      status: "borrowed",
      photo_url: null,
    });
    // loan lookup for borrowed items
    mockList.mockResolvedValueOnce({ items: [] });

    renderWithProviders(<PublicItem />);

    expect(await screen.findByText("Hammer")).toBeInTheDocument();
    expect(screen.getByText(/currently borrowed/)).toBeInTheDocument();
    expect(screen.queryByText("Borrow This")).not.toBeInTheDocument();
  });

  it("opens borrow form when Borrow This is clicked", async () => {
    setupMocksForItem({
      id: "item-1",
      library_id: "lib-1",
      name: "Drill",
      description: null,
      status: "available",
      photo_url: null,
    });

    renderWithProviders(<PublicItem />);

    fireEvent.click(await screen.findByText("Borrow This"));

    expect(screen.getByText("Request to Borrow")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Your name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Phone number")).toBeInTheDocument();
    expect(screen.getByText("Send Request")).toBeInTheDocument();
  });

  it("submits borrow form via requestBorrow", async () => {
    setupMocksForItem({
      id: "item-1",
      library_id: "lib-1",
      name: "Drill",
      description: null,
      status: "available",
      photo_url: null,
    });
    mockRequestBorrow.mockResolvedValue({ id: "req-123" });

    renderWithProviders(<PublicItem />);

    fireEvent.click(await screen.findByText("Borrow This"));

    fireEvent.change(screen.getByPlaceholderText("Your name"), {
      target: { value: "Alice" },
    });
    fireEvent.change(screen.getByPlaceholderText("Phone number"), {
      target: { value: "+15551234567" },
    });
    fireEvent.submit(screen.getByText("Send Request").closest("form")!);

    await waitFor(() => {
      expect(mockRequestBorrow).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId: "item-1",
          name: "Alice",
          phone: "+15551234567",
          message: null,
          privatePossession: false,
        }),
      );
    });

    // Verify navigation to confirmation page with request ID
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/borrow/req-123");
    });
  });

  it("shows error on borrow failure", async () => {
    setupMocksForItem({
      id: "item-1",
      library_id: "lib-1",
      name: "Drill",
      description: null,
      status: "available",
      photo_url: null,
    });
    mockRequestBorrow.mockRejectedValue(new Error("Item is not available"));

    renderWithProviders(<PublicItem />);

    fireEvent.click(await screen.findByText("Borrow This"));
    fireEvent.change(screen.getByPlaceholderText("Your name"), {
      target: { value: "Bob" },
    });
    fireEvent.change(screen.getByPlaceholderText("Phone number"), {
      target: { value: "+15559876543" },
    });
    fireEvent.submit(screen.getByText("Send Request").closest("form")!);

    expect(await screen.findByText("Something went wrong. Please try again.")).toBeInTheDocument();
  });

  it("hides borrow form when Cancel is clicked", async () => {
    setupMocksForItem({
      id: "item-1",
      library_id: "lib-1",
      name: "Drill",
      description: null,
      status: "available",
      photo_url: null,
    });

    renderWithProviders(<PublicItem />);

    fireEvent.click(await screen.findByText("Borrow This"));
    expect(screen.getByText("Request to Borrow")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Request to Borrow")).not.toBeInTheDocument();
    expect(screen.getByText("Borrow This")).toBeInTheDocument();
  });
});
