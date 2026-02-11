import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./testHelpers";

const mockGet = vi.fn();
const mockList = vi.fn();
const mockDelete = vi.fn();

let mockLoggedIn = true;

vi.mock("../src/lib/ayb", () => ({
  ayb: {
    records: {
      get: (...args: unknown[]) => mockGet(...args),
      list: (...args: unknown[]) => mockList(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
  isLoggedIn: () => mockLoggedIn,
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ id: "lib-1" }),
    useNavigate: () => mockNavigate,
  };
});

import LibraryDetail from "../src/pages/LibraryDetail";

function setupLibrary(
  items: Record<string, unknown>[] = [],
  facetDefs: Record<string, unknown>[] = [],
  facetValues: Record<string, unknown>[] = [],
  loans: Record<string, unknown>[] = [],
) {
  // get library
  mockGet.mockResolvedValueOnce({
    id: "lib-1",
    name: "Power Tools",
    slug: "power-tools-abc1",
    description: "My tool collection",
    is_public: true,
    show_borrower_names: true,
    show_return_dates: true,
  });
  // list items
  mockList.mockResolvedValueOnce({ items });
  // list facet defs
  mockList.mockResolvedValueOnce({ items: facetDefs });
  // list facet values
  mockList.mockResolvedValueOnce({ items: facetValues });
  // list loans
  mockList.mockResolvedValueOnce({ items: loans });
  // list circles
  mockList.mockResolvedValueOnce({ items: [] });
}

describe("LibraryDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoggedIn = true;
  });

  it("redirects to login when not logged in", () => {
    mockLoggedIn = false;

    renderWithProviders(<LibraryDetail />);

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("renders skeleton loading state initially", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    mockList.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<LibraryDetail />);

    expect(screen.getByLabelText("Loading library")).toBeInTheDocument();
  });

  it("renders library not found when get fails", async () => {
    mockGet.mockRejectedValueOnce(new Error("Not found"));
    mockList.mockResolvedValue({ items: [] });

    renderWithProviders(<LibraryDetail />);

    expect(await screen.findByText("Unable to load library")).toBeInTheDocument();
  });

  it("renders library header with name and description", async () => {
    setupLibrary();

    renderWithProviders(<LibraryDetail />);

    expect(await screen.findByText("Power Tools")).toBeInTheDocument();
    expect(screen.getByText("My tool collection")).toBeInTheDocument();
  });

  it("renders back link to dashboard", async () => {
    setupLibrary();

    renderWithProviders(<LibraryDetail />);

    const backLink = await screen.findByText(/My Libraries/);
    expect(backLink.closest("a")).toHaveAttribute("href", "/dashboard");
  });

  it("renders add item link", async () => {
    setupLibrary();

    renderWithProviders(<LibraryDetail />);

    await screen.findByText("Power Tools");
    const addLink = screen.getByText("+ Add Item");
    expect(addLink.closest("a")).toHaveAttribute("href", "/dashboard/library/lib-1/add");
  });

  it("renders share link with library slug", async () => {
    setupLibrary();

    renderWithProviders(<LibraryDetail />);

    await screen.findByText("Power Tools");
    expect(screen.getByText(/power-tools-abc1/)).toBeInTheDocument();
  });

  it("renders empty state when no items", async () => {
    setupLibrary([]);

    renderWithProviders(<LibraryDetail />);

    expect(await screen.findByText("No items yet. Start cataloging!")).toBeInTheDocument();
    const addLink = screen.getByText("Add Your First Item");
    expect(addLink.closest("a")).toHaveAttribute("href", "/dashboard/library/lib-1/add");
  });

  it("renders items in a grid", async () => {
    setupLibrary([
      { id: "item-1", library_id: "lib-1", name: "Drill", status: "available", description: "18V", photo_url: null },
      { id: "item-2", library_id: "lib-1", name: "Saw", status: "borrowed", description: null, photo_url: null },
    ]);

    renderWithProviders(<LibraryDetail />);

    expect(await screen.findByText("Drill")).toBeInTheDocument();
    expect(screen.getByText("18V")).toBeInTheDocument();
    expect(screen.getByText("Saw")).toBeInTheDocument();
    expect(screen.getByText("available")).toBeInTheDocument();
    expect(screen.getByText("borrowed")).toBeInTheDocument();
  });

  it("renders item photo when photo_url exists", async () => {
    setupLibrary([
      { id: "item-1", library_id: "lib-1", name: "Drill", status: "available", photo_url: "/api/storage/item-photos/abc.jpg" },
    ]);

    renderWithProviders(<LibraryDetail />);

    const img = await screen.findByAltText("Drill");
    expect(img).toHaveAttribute("src", "/api/storage/item-photos/abc.jpg");
  });

  it("renders facet badges for items", async () => {
    setupLibrary(
      [{ id: "item-1", library_id: "lib-1", name: "Drill", status: "available", photo_url: null }],
      [{ id: "fd-1", library_id: "lib-1", name: "Brand", facet_type: "text", options: null, position: 1 }],
      [{ id: "fv-1", item_id: "item-1", facet_definition_id: "fd-1", value: "DeWalt" }],
    );

    renderWithProviders(<LibraryDetail />);

    expect(await screen.findByText("Brand: DeWalt")).toBeInTheDocument();
  });

  it("shows borrower name and due date for active loans", async () => {
    const dueDate = new Date(Date.now() + 3 * 86400000).toISOString();
    setupLibrary(
      [{ id: "item-1", library_id: "lib-1", name: "Drill", status: "borrowed", photo_url: null }],
      [],
      [],
      [{ id: "loan-1", item_id: "item-1", borrower_id: "bor-1", status: "active", return_by: dueDate }],
    );
    // borrower lookup
    mockList.mockResolvedValueOnce({
      items: [{ id: "bor-1", name: "Alice", phone: "+15551111111" }],
    });

    renderWithProviders(<LibraryDetail />);

    expect(await screen.findByText(/Borrowed by Alice/)).toBeInTheDocument();
    expect(screen.getByText(/due /)).toBeInTheDocument();
  });

  it("deletes item when confirmed via dialog", async () => {
    setupLibrary([
      { id: "item-1", library_id: "lib-1", name: "Disposable", status: "available", photo_url: null },
    ]);
    mockDelete.mockResolvedValueOnce(undefined);

    renderWithProviders(<LibraryDetail />);

    await screen.findByText("Disposable");
    fireEvent.click(screen.getByText("Delete"));

    // ConfirmDialog should appear
    expect(await screen.findByText(/Delete "Disposable"/)).toBeInTheDocument();

    // Click the Delete button in the dialog
    const dialogButtons = screen.getAllByRole("button", { name: "Delete" });
    const dialogDeleteBtn = dialogButtons[dialogButtons.length - 1];
    fireEvent.click(dialogDeleteBtn);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith("items", "item-1");
    });
    await waitFor(() => {
      expect(screen.queryByText("Disposable")).not.toBeInTheDocument();
    });
  });

  it("does not delete item when dialog is cancelled", async () => {
    setupLibrary([
      { id: "item-1", library_id: "lib-1", name: "Keep Me", status: "available", photo_url: null },
    ]);

    renderWithProviders(<LibraryDetail />);

    await screen.findByText("Keep Me");
    fireEvent.click(screen.getByText("Delete"));

    // ConfirmDialog should appear
    expect(await screen.findByText(/Delete "Keep Me"/)).toBeInTheDocument();

    // Click Cancel in dialog
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockDelete).not.toHaveBeenCalled();
    expect(screen.getByText("Keep Me")).toBeInTheDocument();
  });

  it("renders facet definitions as badges", async () => {
    setupLibrary(
      [],
      [{ id: "fd-1", library_id: "lib-1", name: "Brand", facet_type: "text", options: null, position: 1 }],
    );

    renderWithProviders(<LibraryDetail />);

    await screen.findByText("Power Tools");
    expect(screen.getByText("Brand")).toBeInTheDocument();
  });

  it("shows Add Facet form when clicked", async () => {
    setupLibrary();

    renderWithProviders(<LibraryDetail />);

    await screen.findByText("Power Tools");
    fireEvent.click(screen.getByText("+ Add Facet"));

    expect(screen.getByPlaceholderText(/Battery Size/)).toBeInTheDocument();
  });
});
