import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "./testHelpers";
import PublicLibrary from "../src/pages/PublicLibrary";

const mockList = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ slug: "power-tools-abc1" }),
  };
});

vi.mock("../src/lib/ayb", () => ({
  ayb: {
    records: {
      list: (...args: unknown[]) => mockList(...args),
    },
  },
  isLoggedIn: () => false,
}));

describe("PublicLibrary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders skeleton loading state initially", () => {
    mockList.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<PublicLibrary />);

    expect(screen.getByLabelText("Loading library")).toBeInTheDocument();
  });

  it("renders not-found when library doesn't exist", async () => {
    mockList.mockResolvedValue({ items: [] });

    renderWithProviders(<PublicLibrary />);

    expect(await screen.findByText("Library not found")).toBeInTheDocument();
    expect(screen.getByText(/doesn't exist or is private/)).toBeInTheDocument();
  });

  it("renders library with items", async () => {
    // First call: library lookup by slug
    mockList.mockResolvedValueOnce({
      items: [
        {
          id: "lib-1",
          name: "Power Tools",
          slug: "power-tools-abc1",
          description: "My collection of tools",
          is_public: true,
        },
      ],
    });
    // Second call: items for library
    mockList.mockResolvedValueOnce({
      items: [
        { id: "item-1", library_id: "lib-1", name: "Cordless Drill", status: "available", photo_url: null },
        { id: "item-2", library_id: "lib-1", name: "Circular Saw", status: "borrowed", photo_url: null },
      ],
    });
    // Third call: facet definitions
    mockList.mockResolvedValueOnce({ items: [] });
    // Fourth call: facet values
    mockList.mockResolvedValueOnce({ items: [] });
    // Fifth call: loans
    mockList.mockResolvedValueOnce({ items: [] });

    renderWithProviders(<PublicLibrary />);

    expect(await screen.findByText("Power Tools")).toBeInTheDocument();
    expect(screen.getByText("My collection of tools")).toBeInTheDocument();
    expect(screen.getByText("Cordless Drill")).toBeInTheDocument();
    expect(screen.getByText("Circular Saw")).toBeInTheDocument();
    expect(screen.getByText("2 items available to borrow")).toBeInTheDocument();
  });

  it("filters items by search", async () => {
    mockList.mockResolvedValueOnce({
      items: [{ id: "lib-1", name: "Tools", slug: "tools", is_public: true }],
    });
    mockList.mockResolvedValueOnce({
      items: [
        { id: "i1", library_id: "lib-1", name: "Drill", status: "available", photo_url: null },
        { id: "i2", library_id: "lib-1", name: "Hammer", status: "available", photo_url: null },
      ],
    });
    mockList.mockResolvedValueOnce({ items: [] });
    mockList.mockResolvedValueOnce({ items: [] });
    mockList.mockResolvedValueOnce({ items: [] });

    renderWithProviders(<PublicLibrary />);

    expect(await screen.findByText("Drill")).toBeInTheDocument();
    expect(screen.getByText("Hammer")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search items..."), {
      target: { value: "Drill" },
    });

    expect(screen.getByText("Drill")).toBeInTheDocument();
    expect(screen.queryByText("Hammer")).not.toBeInTheDocument();
  });

  it("shows empty message when library has no items", async () => {
    mockList.mockResolvedValueOnce({
      items: [{ id: "lib-1", name: "Empty Lib", slug: "empty", is_public: true }],
    });
    mockList.mockResolvedValueOnce({ items: [] });
    mockList.mockResolvedValueOnce({ items: [] });
    mockList.mockResolvedValueOnce({ items: [] });
    mockList.mockResolvedValueOnce({ items: [] });

    renderWithProviders(<PublicLibrary />);

    expect(await screen.findByText("This library is empty")).toBeInTheDocument();
  });

  it("shows no-match message when search has no results", async () => {
    mockList.mockResolvedValueOnce({
      items: [{ id: "lib-1", name: "Tools", slug: "tools", is_public: true }],
    });
    mockList.mockResolvedValueOnce({
      items: [
        { id: "i1", library_id: "lib-1", name: "Drill", status: "available", photo_url: null },
      ],
    });
    mockList.mockResolvedValueOnce({ items: [] });
    mockList.mockResolvedValueOnce({ items: [] });
    mockList.mockResolvedValueOnce({ items: [] });

    renderWithProviders(<PublicLibrary />);

    expect(await screen.findByText("Drill")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search items..."), {
      target: { value: "Nonexistent" },
    });

    expect(screen.getByText("No items match your filters")).toBeInTheDocument();
    expect(screen.queryByText("Drill")).not.toBeInTheDocument();
  });
});
