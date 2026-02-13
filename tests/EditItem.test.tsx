import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./testHelpers";

const mockGet = vi.fn();
const mockList = vi.fn();
const mockUpdate = vi.fn();
const mockCreate = vi.fn();
const mockDelete = vi.fn();
const mockUpload = vi.fn();

let mockLoggedIn = true;

vi.mock("../src/lib/ayb", () => ({
  ayb: {
    records: {
      get: (...args: unknown[]) => mockGet(...args),
      list: (...args: unknown[]) => mockList(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
    storage: {
      upload: (...args: unknown[]) => mockUpload(...args),
    },
  },
  isLoggedIn: () => mockLoggedIn,
}));

const mockProcessImage = vi.fn();
const mockCreatePreview = vi.fn();
vi.mock("../src/lib/image", () => ({
  processImage: (...args: unknown[]) => mockProcessImage(...args),
  createPreview: (...args: unknown[]) => mockCreatePreview(...args),
}));

vi.mock("../src/components/ImageCropper", () => ({
  default: ({ onCrop, onCancel }: { src: string; onCrop: (b: Blob) => void; onCancel: () => void }) => (
    <div data-testid="image-cropper">
      <button onClick={() => onCrop(new Blob(["cropped"], { type: "image/jpeg" }))}>
        Crop & Use
      </button>
      <button onClick={onCancel}>Skip Crop</button>
    </div>
  ),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ id: "lib-1", itemId: "item-1" }),
    useNavigate: () => mockNavigate,
  };
});

import EditItem from "../src/pages/EditItem";

// ---------- helpers ----------

const LIBRARY = {
  id: "lib-1",
  name: "Power Tools",
  slug: "power-tools",
  owner_id: "user-1",
  description: null,
  cover_photo: null,
  is_public: true,
  show_borrower_names: true,
  show_return_dates: true,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

const ITEM: {
  id: string;
  library_id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  status: "available";
  max_borrow_days: number | null;
  visibility: "public";
  circle_id: string | null;
  created_at: string;
  updated_at: string;
} = {
  id: "item-1",
  library_id: "lib-1",
  name: "Cordless Drill",
  description: "18V with two batteries",
  photo_url: "/api/storage/item-photos/drill.jpg",
  status: "available",
  max_borrow_days: 14,
  visibility: "public",
  circle_id: null,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

type FacetDef = {
  id: string;
  library_id: string;
  name: string;
  facet_type: "text" | "number" | "boolean";
  options: string[] | null;
  position: number;
  created_at: string;
};

const FACET_DEFS: FacetDef[] = [
  { id: "fd-1", library_id: "lib-1", name: "Brand", facet_type: "text", options: null, position: 1, created_at: "2025-01-01T00:00:00Z" },
];

const FACET_VALUES = [
  { id: "fv-1", item_id: "item-1", facet_definition_id: "fd-1", value: "DeWalt" },
];

/**
 * Set up the four Promise.all calls the component makes on mount:
 *  1. ayb.records.get("libraries", id)
 *  2. ayb.records.get("items", itemId)
 *  3. ayb.records.list("facet_definitions", ...)
 *  4. ayb.records.list("item_facets", ...)
 */
function setupPageLoad(opts?: {
  library?: typeof LIBRARY | null;
  item?: typeof ITEM | null;
  facetDefs?: FacetDef[];
  facetValues?: typeof FACET_VALUES;
}) {
  const lib = opts?.library ?? LIBRARY;
  const item = opts?.item ?? ITEM;
  const fds = opts?.facetDefs ?? [];
  const fvs = opts?.facetValues ?? [];

  // get library
  mockGet.mockResolvedValueOnce(lib);
  // get item
  mockGet.mockResolvedValueOnce(item);
  // list facet definitions
  mockList.mockResolvedValueOnce({ items: fds });
  // list existing facet values
  mockList.mockResolvedValueOnce({ items: fvs });
}

// ---------- tests ----------

describe("EditItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoggedIn = true;
    globalThis.URL.createObjectURL = vi.fn(() => "blob:http://localhost/fake-url");
    // Default VITE_AYB_URL for resolving relative photo paths
    import.meta.env.VITE_AYB_URL = "https://api.shareborough.com";
  });

  afterEach(() => {
    delete (import.meta.env as Record<string, unknown>).VITE_AYB_URL;
  });

  // ---- 1. Auth guard ----
  it("redirects to login when not logged in", () => {
    mockLoggedIn = false;

    renderWithProviders(<EditItem />);

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  // ---- 2. Loading skeleton ----
  it("renders loading skeleton with shimmer elements", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    mockList.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<EditItem />);

    const loadingRegion = screen.getByLabelText("Loading edit item form");
    expect(loadingRegion).toBeInTheDocument();
    // All shimmer placeholders inside
    const shimmers = loadingRegion.querySelectorAll(".skeleton-shimmer");
    expect(shimmers.length).toBeGreaterThanOrEqual(4);
  });

  // ---- 3. Not-found state ----
  it("renders 'Item not found' when library/item load fails", async () => {
    mockGet.mockRejectedValue(new Error("not found"));
    mockList.mockResolvedValue({ items: [] });

    renderWithProviders(<EditItem />);

    expect(await screen.findByText("Item not found")).toBeInTheDocument();
  });

  // ---- 4. Loads existing item data into form ----
  it("loads existing item data into form fields", async () => {
    setupPageLoad();

    renderWithProviders(<EditItem />);

    expect(await screen.findByRole("heading", { name: "Edit Item" })).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText("What is this item?") as HTMLInputElement;
    expect(nameInput.value).toBe("Cordless Drill");

    const descInput = screen.getByPlaceholderText("Any details about this item...") as HTMLTextAreaElement;
    expect(descInput.value).toBe("18V with two batteries");

    const maxDaysInput = screen.getByPlaceholderText("e.g. 14") as HTMLInputElement;
    expect(maxDaysInput.value).toBe("14");
  });

  // ---- 5. Resolves relative /api/ photo URLs ----
  it("resolves relative /api/ photo URLs to VITE_AYB_URL prefix for preview", async () => {
    setupPageLoad();

    renderWithProviders(<EditItem />);

    await screen.findByRole("heading", { name: "Edit Item" });

    const preview = screen.getByAltText("Preview") as HTMLImageElement;
    expect(preview.src).toBe("https://api.shareborough.com/api/storage/item-photos/drill.jpg");
  });

  // ---- 6. Shows photo preview when item has photo_url ----
  it("shows photo preview when item has photo_url", async () => {
    setupPageLoad();

    renderWithProviders(<EditItem />);

    await screen.findByRole("heading", { name: "Edit Item" });

    const preview = screen.getByAltText("Preview");
    expect(preview).toBeInTheDocument();
  });

  it("does not show preview when item has no photo_url", async () => {
    setupPageLoad({ item: { ...ITEM, photo_url: null } });

    renderWithProviders(<EditItem />);

    await screen.findByRole("heading", { name: "Edit Item" });

    expect(screen.queryByAltText("Preview")).not.toBeInTheDocument();
  });

  // ---- 7. Updates item on Save Changes ----
  it("calls ayb.records.update with correct data on Save Changes", async () => {
    setupPageLoad();
    mockUpdate.mockResolvedValueOnce({});
    // list existing facets for deletion step
    mockList.mockResolvedValueOnce({ items: [] });

    renderWithProviders(<EditItem />);

    await screen.findByRole("heading", { name: "Edit Item" });

    // Change the name
    fireEvent.change(screen.getByPlaceholderText("What is this item?"), {
      target: { value: "Updated Drill" },
    });

    fireEvent.submit(screen.getByRole("button", { name: "Save Changes" }).closest("form")!);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith("items", "item-1", {
        name: "Updated Drill",
        description: "18V with two batteries",
        photo_url: "/api/storage/item-photos/drill.jpg",
        max_borrow_days: 14,
      });
    });
  });

  // ---- 8. Uploads new photo before updating item ----
  it("uploads new photo before updating item", async () => {
    setupPageLoad();

    const processedFile = new File(["photo-data"], "new-drill.jpg", { type: "image/jpeg" });
    mockProcessImage.mockResolvedValue(processedFile);
    mockCreatePreview.mockResolvedValue("data:image/jpeg;base64,abc123");
    mockUpload.mockResolvedValueOnce({ name: "newphoto.jpg" });
    mockUpdate.mockResolvedValueOnce({});
    // list existing facets for deletion
    mockList.mockResolvedValueOnce({ items: [] });

    renderWithProviders(<EditItem />);

    await screen.findByRole("heading", { name: "Edit Item" });

    // Select a new photo
    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement;
    const file = new File(["photo-data"], "new-drill.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Crop the image
    const cropBtn = await screen.findByText("Crop & Use");
    fireEvent.click(cropBtn);

    // Wait for preview to update
    await waitFor(() => {
      expect(screen.getByAltText("Preview")).toBeInTheDocument();
    });

    // Submit the form
    fireEvent.submit(screen.getByRole("button", { name: "Save Changes" }).closest("form")!);

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledWith("item-photos", expect.any(File));
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith("items", "item-1", expect.objectContaining({
        photo_url: "/api/storage/item-photos/newphoto.jpg",
      }));
    });
  });

  // ---- 9. Shows "Saving..." state during submission ----
  it("shows 'Saving...' state during submission", async () => {
    setupPageLoad();
    // Make update hang so we can observe loading state
    mockUpdate.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<EditItem />);

    await screen.findByRole("heading", { name: "Edit Item" });

    fireEvent.submit(screen.getByRole("button", { name: "Save Changes" }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Saving...")).toBeInTheDocument();
    });
  });

  // ---- 10. Shows error on update failure ----
  it("shows error on update failure via toast and inline", async () => {
    setupPageLoad();
    mockUpdate.mockRejectedValueOnce(new Error("Storage quota exceeded"));

    renderWithProviders(<EditItem />);

    await screen.findByRole("heading", { name: "Edit Item" });

    fireEvent.submit(screen.getByRole("button", { name: "Save Changes" }).closest("form")!);

    // The friendly error maps "Storage quota exceeded" to this message.
    // It appears inline and in the toast, so use findAllByText.
    const msgs = await screen.findAllByText("The storage limit has been reached. Please contact the library owner.");
    expect(msgs.length).toBeGreaterThanOrEqual(1);
  });

  it("shows generic friendly error for non-Error exceptions", async () => {
    setupPageLoad();
    mockUpdate.mockRejectedValueOnce("unexpected failure");

    renderWithProviders(<EditItem />);

    await screen.findByRole("heading", { name: "Edit Item" });

    fireEvent.submit(screen.getByRole("button", { name: "Save Changes" }).closest("form")!);

    const msgs = await screen.findAllByText("unexpected failure");
    expect(msgs.length).toBeGreaterThanOrEqual(1);
  });

  // ---- 11. Navigates back to library after successful save ----
  it("navigates back to library after successful save", async () => {
    setupPageLoad();
    mockUpdate.mockResolvedValueOnce({});
    // list existing facets for deletion step
    mockList.mockResolvedValueOnce({ items: [] });

    renderWithProviders(<EditItem />);

    await screen.findByRole("heading", { name: "Edit Item" });

    fireEvent.submit(screen.getByRole("button", { name: "Save Changes" }).closest("form")!);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/library/lib-1");
    });
  });

  // ---- 12. Shows back link to library ----
  it("shows back link to library", async () => {
    setupPageLoad();

    renderWithProviders(<EditItem />);

    const backLink = await screen.findByText(/Back to Power Tools/);
    expect(backLink).toBeInTheDocument();
    expect(backLink.closest("a")).toHaveAttribute("href", "/dashboard/library/lib-1");
  });

  // ---- 13. Renders facet values from existing data ----
  describe("facet values", () => {
    it("renders existing text facet value in input", async () => {
      setupPageLoad({ facetDefs: FACET_DEFS, facetValues: FACET_VALUES });

      renderWithProviders(<EditItem />);

      await screen.findByRole("heading", { name: "Edit Item" });

      expect(screen.getByText("Details")).toBeInTheDocument();
      expect(screen.getByText("Brand")).toBeInTheDocument();
      const brandInput = screen.getByPlaceholderText("Brand") as HTMLInputElement;
      expect(brandInput.value).toBe("DeWalt");
    });

    it("renders select dropdown for facets with options and pre-selects existing value", async () => {
      const optionFacetDefs = [
        { id: "fd-2", library_id: "lib-1", name: "Condition", facet_type: "text" as const, options: ["New", "Used", "Fair"], position: 1, created_at: "2025-01-01T00:00:00Z" },
      ];
      const optionFacetValues = [
        { id: "fv-2", item_id: "item-1", facet_definition_id: "fd-2", value: "Used" },
      ];

      setupPageLoad({ facetDefs: optionFacetDefs, facetValues: optionFacetValues });

      renderWithProviders(<EditItem />);

      await screen.findByRole("heading", { name: "Edit Item" });

      expect(screen.getByText("Condition")).toBeInTheDocument();
      const select = screen.getByDisplayValue("Used") as HTMLSelectElement;
      expect(select.value).toBe("Used");
    });

    it("renders boolean facet as Yes/No select with existing value", async () => {
      const boolDefs = [
        { id: "fd-3", library_id: "lib-1", name: "Has Case?", facet_type: "boolean" as const, options: null, position: 1, created_at: "2025-01-01T00:00:00Z" },
      ];
      const boolValues = [
        { id: "fv-3", item_id: "item-1", facet_definition_id: "fd-3", value: "true" },
      ];

      setupPageLoad({ facetDefs: boolDefs, facetValues: boolValues });

      renderWithProviders(<EditItem />);

      await screen.findByRole("heading", { name: "Edit Item" });

      expect(screen.getByText("Has Case?")).toBeInTheDocument();
      const select = screen.getByDisplayValue("Yes") as HTMLSelectElement;
      expect(select.value).toBe("true");
    });

    it("renders number facet input with existing value", async () => {
      const numDefs = [
        { id: "fd-4", library_id: "lib-1", name: "Voltage", facet_type: "number" as const, options: null, position: 1, created_at: "2025-01-01T00:00:00Z" },
      ];
      const numValues = [
        { id: "fv-4", item_id: "item-1", facet_definition_id: "fd-4", value: "18" },
      ];

      setupPageLoad({ facetDefs: numDefs, facetValues: numValues });

      renderWithProviders(<EditItem />);

      await screen.findByRole("heading", { name: "Edit Item" });

      const input = screen.getByPlaceholderText("Voltage") as HTMLInputElement;
      expect(input.type).toBe("number");
      expect(input.value).toBe("18");
    });

    it("deletes old facet values and creates new ones on save", async () => {
      setupPageLoad({ facetDefs: FACET_DEFS, facetValues: FACET_VALUES });
      mockUpdate.mockResolvedValueOnce({});
      // On submit, component re-lists existing facets to delete them
      mockList.mockResolvedValueOnce({ items: FACET_VALUES });
      mockDelete.mockResolvedValueOnce({});
      mockCreate.mockResolvedValueOnce({});

      renderWithProviders(<EditItem />);

      await screen.findByRole("heading", { name: "Edit Item" });

      // Change the facet value
      fireEvent.change(screen.getByPlaceholderText("Brand"), {
        target: { value: "Makita" },
      });

      fireEvent.submit(screen.getByRole("button", { name: "Save Changes" }).closest("form")!);

      // Should delete old facet value
      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalledWith("item_facets", "fv-1");
      });

      // Should create new facet value
      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith("item_facets", {
          item_id: "item-1",
          facet_definition_id: "fd-1",
          value: "Makita",
        });
      });
    });

    it("skips creating facet value when value is empty", async () => {
      setupPageLoad({ facetDefs: FACET_DEFS, facetValues: FACET_VALUES });
      mockUpdate.mockResolvedValueOnce({});
      // Re-list existing facets for deletion
      mockList.mockResolvedValueOnce({ items: FACET_VALUES });
      mockDelete.mockResolvedValueOnce({});

      renderWithProviders(<EditItem />);

      await screen.findByRole("heading", { name: "Edit Item" });

      // Clear the facet value
      fireEvent.change(screen.getByPlaceholderText("Brand"), {
        target: { value: "" },
      });

      fireEvent.submit(screen.getByRole("button", { name: "Save Changes" }).closest("form")!);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard/library/lib-1");
      });

      // Old value deleted, but no new one created
      expect(mockDelete).toHaveBeenCalledWith("item_facets", "fv-1");
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  // ---- additional edge-case coverage ----

  describe("edge cases", () => {
    it("handles item with no description gracefully", async () => {
      setupPageLoad({ item: { ...ITEM, description: null } });

      renderWithProviders(<EditItem />);

      await screen.findByRole("heading", { name: "Edit Item" });

      const descInput = screen.getByPlaceholderText("Any details about this item...") as HTMLTextAreaElement;
      expect(descInput.value).toBe("");
    });

    it("handles item with no max_borrow_days gracefully", async () => {
      setupPageLoad({ item: { ...ITEM, max_borrow_days: null } });

      renderWithProviders(<EditItem />);

      await screen.findByRole("heading", { name: "Edit Item" });

      const maxDaysInput = screen.getByPlaceholderText("e.g. 14") as HTMLInputElement;
      expect(maxDaysInput.value).toBe("");
    });

    it("sends null description when description field is empty", async () => {
      setupPageLoad({ item: { ...ITEM, description: "old desc" } });
      mockUpdate.mockResolvedValueOnce({});
      mockList.mockResolvedValueOnce({ items: [] });

      renderWithProviders(<EditItem />);

      await screen.findByRole("heading", { name: "Edit Item" });

      // Clear description
      fireEvent.change(screen.getByPlaceholderText("Any details about this item..."), {
        target: { value: "" },
      });

      fireEvent.submit(screen.getByRole("button", { name: "Save Changes" }).closest("form")!);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith("items", "item-1", expect.objectContaining({
          description: null,
        }));
      });
    });

    it("sends null max_borrow_days when field is empty", async () => {
      setupPageLoad();
      mockUpdate.mockResolvedValueOnce({});
      mockList.mockResolvedValueOnce({ items: [] });

      renderWithProviders(<EditItem />);

      await screen.findByRole("heading", { name: "Edit Item" });

      // Clear max borrow days
      fireEvent.change(screen.getByPlaceholderText("e.g. 14"), {
        target: { value: "" },
      });

      fireEvent.submit(screen.getByRole("button", { name: "Save Changes" }).closest("form")!);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith("items", "item-1", expect.objectContaining({
          max_borrow_days: null,
        }));
      });
    });

    it("preserves existing photo_url when no new photo is uploaded", async () => {
      setupPageLoad();
      mockUpdate.mockResolvedValueOnce({});
      mockList.mockResolvedValueOnce({ items: [] });

      renderWithProviders(<EditItem />);

      await screen.findByRole("heading", { name: "Edit Item" });

      fireEvent.submit(screen.getByRole("button", { name: "Save Changes" }).closest("form")!);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith("items", "item-1", expect.objectContaining({
          photo_url: "/api/storage/item-photos/drill.jpg",
        }));
      });

      expect(mockUpload).not.toHaveBeenCalled();
    });

    it("does not show facet section when no facet definitions exist", async () => {
      setupPageLoad({ facetDefs: [], facetValues: [] });

      renderWithProviders(<EditItem />);

      await screen.findByRole("heading", { name: "Edit Item" });

      expect(screen.queryByText("Details")).not.toBeInTheDocument();
    });

    it("shows toast on successful save", async () => {
      setupPageLoad();
      mockUpdate.mockResolvedValueOnce({});
      mockList.mockResolvedValueOnce({ items: [] });

      renderWithProviders(<EditItem />);

      await screen.findByRole("heading", { name: "Edit Item" });

      fireEvent.submit(screen.getByRole("button", { name: "Save Changes" }).closest("form")!);

      await waitFor(() => {
        expect(screen.getByText("Item updated")).toBeInTheDocument();
      });
    });

    it("uses absolute photo URL without modification when not a relative /api/ path", async () => {
      setupPageLoad({
        item: { ...ITEM, photo_url: "https://cdn.example.com/photo.jpg" },
      });

      renderWithProviders(<EditItem />);

      await screen.findByRole("heading", { name: "Edit Item" });

      const preview = screen.getByAltText("Preview") as HTMLImageElement;
      expect(preview.src).toBe("https://cdn.example.com/photo.jpg");
    });
  });
});
