import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./testHelpers";

const mockGet = vi.fn();
const mockList = vi.fn();
const mockCreate = vi.fn();
const mockUpload = vi.fn();

let mockLoggedIn = true;

vi.mock("../src/lib/ayb", () => ({
  ayb: {
    records: {
      get: (...args: unknown[]) => mockGet(...args),
      list: (...args: unknown[]) => mockList(...args),
      create: (...args: unknown[]) => mockCreate(...args),
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

// Mock ImageCropper to immediately call onCrop or render a simple UI
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

// Mock BarcodeScanner — render a simple UI that fires onDetected or onClose
const mockOnDetectedRef = { current: null as null | ((code: string, format: string) => void) };
const mockOnCloseRef = { current: null as null | (() => void) };
vi.mock("../src/components/BarcodeScanner", () => ({
  default: ({ onDetected, onClose }: { onDetected: (code: string, format: string) => void; onClose: () => void }) => {
    mockOnDetectedRef.current = onDetected;
    mockOnCloseRef.current = onClose;
    return (
      <div data-testid="barcode-scanner">
        <button onClick={() => onDetected("9780134685991", "ean_13")}>Simulate Scan</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    );
  },
}));

const mockFormatBarcodeResult = vi.fn();
vi.mock("../src/lib/barcode", () => ({
  formatBarcodeResult: (...args: unknown[]) => mockFormatBarcodeResult(...args),
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

import AddItem from "../src/pages/AddItem";

function setupLibraryLoad(facets: Record<string, unknown>[] = []) {
  // get library
  mockGet.mockResolvedValueOnce({
    id: "lib-1",
    name: "Power Tools",
    slug: "power-tools",
  });
  // list facet definitions
  mockList.mockResolvedValueOnce({ items: facets });
  // list circles
  mockList.mockResolvedValueOnce({ items: [] });
}

describe("AddItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoggedIn = true;
    // Mock URL.createObjectURL
    globalThis.URL.createObjectURL = vi.fn(() => "blob:http://localhost/fake-url");
  });

  it("redirects to login when not logged in", () => {
    mockLoggedIn = false;

    renderWithProviders(<AddItem />);

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("renders skeleton loading state initially", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    mockList.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<AddItem />);

    expect(screen.getByLabelText("Loading add item form")).toBeInTheDocument();
  });

  it("renders the add item form after library loads", async () => {
    setupLibraryLoad();

    renderWithProviders(<AddItem />);

    expect(await screen.findByRole("heading", { name: "Add Item" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("What is this item?")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Any details about this item...")).toBeInTheDocument();
    expect(screen.getByText("📸 Camera")).toBeInTheDocument();
    expect(screen.getByText("🖼️ Gallery")).toBeInTheDocument();
  });

  it("renders back link to library", async () => {
    setupLibraryLoad();

    renderWithProviders(<AddItem />);

    const backLink = await screen.findByText(/Back to Power Tools/);
    expect(backLink).toBeInTheDocument();
    expect(backLink.closest("a")).toHaveAttribute("href", "/dashboard/library/lib-1");
  });

  describe("camera capture", () => {
    it("has capture='environment' attribute for mobile camera access", async () => {
      setupLibraryLoad();

      renderWithProviders(<AddItem />);

      await screen.findByRole("heading", { name: "Add Item" });
      const fileInput = document.querySelector("input[type='file']") as HTMLInputElement;
      expect(fileInput).not.toBeNull();
      expect(fileInput.getAttribute("capture")).toBe("environment");
    });

    it("accepts image files only via accept='image/*'", async () => {
      setupLibraryLoad();

      renderWithProviders(<AddItem />);

      await screen.findByRole("heading", { name: "Add Item" });
      const fileInput = document.querySelector("input[type='file']") as HTMLInputElement;
      expect(fileInput).not.toBeNull();
      expect(fileInput.getAttribute("accept")).toBe("image/*");
    });

    it("shows cropper after selecting a file", async () => {
      setupLibraryLoad();

      const processedFile = new File(["photo-data"], "test-photo.jpg", { type: "image/jpeg" });
      mockProcessImage.mockResolvedValue(processedFile);
      mockCreatePreview.mockResolvedValue("data:image/jpeg;base64,abc123");

      renderWithProviders(<AddItem />);

      await screen.findByRole("heading", { name: "Add Item" });

      const file = new File(["photo-data"], "test-photo.jpg", { type: "image/jpeg" });
      const fileInput = document.querySelector("input[type='file']") as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      // Should show the cropper
      expect(await screen.findByTestId("image-cropper")).toBeInTheDocument();
      expect(screen.getByText("Crop & Use")).toBeInTheDocument();
    });

    it("shows preview after cropping", async () => {
      setupLibraryLoad();

      const processedFile = new File(["photo-data"], "test-photo.jpg", { type: "image/jpeg" });
      mockProcessImage.mockResolvedValue(processedFile);
      mockCreatePreview.mockResolvedValue("data:image/jpeg;base64,abc123");

      renderWithProviders(<AddItem />);

      await screen.findByRole("heading", { name: "Add Item" });

      const file = new File(["photo-data"], "test-photo.jpg", { type: "image/jpeg" });
      const fileInput = document.querySelector("input[type='file']") as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      // Wait for cropper
      const cropBtn = await screen.findByText("Crop & Use");
      fireEvent.click(cropBtn);

      // Preview should now be visible
      await waitFor(() => {
        const previewImg = screen.getByAltText("Preview");
        expect(previewImg).toBeInTheDocument();
      });

      // Camera and Gallery buttons still visible after photo upload
      expect(screen.getByText("📸 Camera")).toBeInTheDocument();
      expect(screen.getByText("🖼️ Gallery")).toBeInTheDocument();
    });

    it("shows helper text about supported formats", async () => {
      setupLibraryLoad();

      renderWithProviders(<AddItem />);

      await screen.findByRole("heading", { name: "Add Item" });
      expect(screen.getByText("JPG, PNG, or HEIC")).toBeInTheDocument();
    });
  });

  describe("form submission", () => {
    it("submits item without photo", async () => {
      setupLibraryLoad();
      mockCreate.mockResolvedValueOnce({ id: "item-1", name: "Hammer" });

      renderWithProviders(<AddItem />);

      await screen.findByRole("heading", { name: "Add Item" });
      fireEvent.change(screen.getByPlaceholderText("What is this item?"), {
        target: { value: "Hammer" },
      });
      fireEvent.submit(screen.getByRole("button", { name: "Add Item" }).closest("form")!);

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith("items", expect.objectContaining({
          library_id: "lib-1",
          name: "Hammer",
          description: null,
          photo_url: null,
        }));
      });

      expect(mockUpload).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/library/lib-1");
    });

    it("uploads cropped photo before creating item", async () => {
      setupLibraryLoad();

      const processedFile = new File(["photo-data"], "drill.jpg", { type: "image/jpeg" });
      mockProcessImage.mockResolvedValue(processedFile);
      mockCreatePreview.mockResolvedValue("data:image/jpeg;base64,abc");
      mockUpload.mockResolvedValueOnce({ name: "abc123.jpg" });
      mockCreate.mockResolvedValueOnce({ id: "item-1", name: "Drill" });

      renderWithProviders(<AddItem />);

      await screen.findByRole("heading", { name: "Add Item" });

      // Select a photo file
      const file = new File(["photo-data"], "drill.jpg", { type: "image/jpeg" });
      const fileInput = document.querySelector("input[type='file']") as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      // Crop the image
      const cropBtn = await screen.findByText("Crop & Use");
      fireEvent.click(cropBtn);

      // Wait for preview
      await waitFor(() => {
        expect(screen.getByAltText("Preview")).toBeInTheDocument();
      });

      // Fill name and submit
      fireEvent.change(screen.getByPlaceholderText("What is this item?"), {
        target: { value: "Drill" },
      });
      fireEvent.submit(screen.getByRole("button", { name: "Add Item" }).closest("form")!);

      await waitFor(() => {
        expect(mockUpload).toHaveBeenCalledWith("item-photos", expect.any(File));
      });

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith("items", expect.objectContaining({
          library_id: "lib-1",
          name: "Drill",
          photo_url: "/api/storage/item-photos/abc123.jpg",
        }));
      });
    });

    it("includes description when provided", async () => {
      setupLibraryLoad();
      mockCreate.mockResolvedValueOnce({ id: "item-1", name: "Saw" });

      renderWithProviders(<AddItem />);

      await screen.findByRole("heading", { name: "Add Item" });
      fireEvent.change(screen.getByPlaceholderText("What is this item?"), {
        target: { value: "Saw" },
      });
      fireEvent.change(screen.getByPlaceholderText("Any details about this item..."), {
        target: { value: "10-inch blade, corded" },
      });
      fireEvent.submit(screen.getByRole("button", { name: "Add Item" }).closest("form")!);

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith("items", expect.objectContaining({
          library_id: "lib-1",
          name: "Saw",
          description: "10-inch blade, corded",
          photo_url: null,
        }));
      });
    });

    it("shows error message on submission failure", async () => {
      setupLibraryLoad();
      mockCreate.mockRejectedValueOnce(new Error("Storage quota exceeded"));

      renderWithProviders(<AddItem />);

      await screen.findByRole("heading", { name: "Add Item" });
      fireEvent.change(screen.getByPlaceholderText("What is this item?"), {
        target: { value: "Broken Item" },
      });
      fireEvent.submit(screen.getByRole("button", { name: "Add Item" }).closest("form")!);

      // Message appears in both inline <p> and toast, so use findAllByText
      const msgs = await screen.findAllByText("The storage limit has been reached. Please contact the library owner.");
      expect(msgs.length).toBeGreaterThanOrEqual(1);
    });

    it("shows generic error for non-Error exceptions", async () => {
      setupLibraryLoad();
      mockCreate.mockRejectedValueOnce("unexpected");

      renderWithProviders(<AddItem />);

      await screen.findByRole("heading", { name: "Add Item" });
      fireEvent.change(screen.getByPlaceholderText("What is this item?"), {
        target: { value: "Mystery Item" },
      });
      fireEvent.submit(screen.getByRole("button", { name: "Add Item" }).closest("form")!);

      // Message appears in both inline <p> and toast, so use findAllByText
      const msgs = await screen.findAllByText("unexpected");
      expect(msgs.length).toBeGreaterThanOrEqual(1);
    });

    it("shows loading state during submission", async () => {
      setupLibraryLoad();
      // Make create hang so we can observe loading state
      mockCreate.mockReturnValue(new Promise(() => {}));

      renderWithProviders(<AddItem />);

      await screen.findByRole("heading", { name: "Add Item" });
      fireEvent.change(screen.getByPlaceholderText("What is this item?"), {
        target: { value: "Slow Item" },
      });
      fireEvent.submit(screen.getByRole("button", { name: "Add Item" }).closest("form")!);

      await waitFor(() => {
        expect(screen.getByText("Adding...")).toBeInTheDocument();
      });
    });
  });

  describe("facet fields", () => {
    it("renders text facet inputs when definitions exist", async () => {
      setupLibraryLoad([
        { id: "fd-1", library_id: "lib-1", name: "Brand", facet_type: "text", options: null, position: 1 },
      ]);

      renderWithProviders(<AddItem />);

      await screen.findByRole("heading", { name: "Add Item" });
      expect(screen.getByText("Details")).toBeInTheDocument();
      expect(screen.getByText("Brand")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Brand")).toBeInTheDocument();
    });

    it("renders select dropdown for facets with options", async () => {
      setupLibraryLoad([
        { id: "fd-1", library_id: "lib-1", name: "Condition", facet_type: "text", options: ["New", "Used", "Fair"], position: 1 },
      ]);

      renderWithProviders(<AddItem />);

      await screen.findByRole("heading", { name: "Add Item" });
      expect(screen.getByText("Condition")).toBeInTheDocument();
      expect(screen.getByText("Select...")).toBeInTheDocument();
      expect(screen.getByText("New")).toBeInTheDocument();
      expect(screen.getByText("Used")).toBeInTheDocument();
      expect(screen.getByText("Fair")).toBeInTheDocument();
    });

    it("renders boolean facet as Yes/No select", async () => {
      setupLibraryLoad([
        { id: "fd-1", library_id: "lib-1", name: "Has Case?", facet_type: "boolean", options: null, position: 1 },
      ]);

      renderWithProviders(<AddItem />);

      await screen.findByRole("heading", { name: "Add Item" });
      expect(screen.getByText("Has Case?")).toBeInTheDocument();
      expect(screen.getByText("Yes")).toBeInTheDocument();
      expect(screen.getByText("No")).toBeInTheDocument();
    });

    it("renders number facet input", async () => {
      setupLibraryLoad([
        { id: "fd-1", library_id: "lib-1", name: "Voltage", facet_type: "number", options: null, position: 1 },
      ]);

      renderWithProviders(<AddItem />);

      await screen.findByRole("heading", { name: "Add Item" });
      const input = screen.getByPlaceholderText("Voltage") as HTMLInputElement;
      expect(input.type).toBe("number");
    });

    it("creates facet values on submission", async () => {
      setupLibraryLoad([
        { id: "fd-1", library_id: "lib-1", name: "Brand", facet_type: "text", options: null, position: 1 },
      ]);
      mockCreate
        .mockResolvedValueOnce({ id: "item-1", name: "Drill" }) // item create
        .mockResolvedValueOnce({}); // facet value create

      renderWithProviders(<AddItem />);

      await screen.findByRole("heading", { name: "Add Item" });
      fireEvent.change(screen.getByPlaceholderText("What is this item?"), {
        target: { value: "Drill" },
      });
      fireEvent.change(screen.getByPlaceholderText("Brand"), {
        target: { value: "DeWalt" },
      });
      fireEvent.submit(screen.getByRole("button", { name: "Add Item" }).closest("form")!);

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledTimes(2); // item + facet
        expect(mockCreate).toHaveBeenNthCalledWith(1, "items", expect.objectContaining({ name: "Drill" }));
        expect(mockCreate).toHaveBeenNthCalledWith(2, "item_facets", {
          item_id: "item-1",
          facet_definition_id: "fd-1",
          value: "DeWalt",
        });
      });
    });

    it("skips empty facet values on submission", async () => {
      setupLibraryLoad([
        { id: "fd-1", library_id: "lib-1", name: "Brand", facet_type: "text", options: null, position: 1 },
      ]);
      mockCreate.mockResolvedValueOnce({ id: "item-1", name: "Drill" });

      renderWithProviders(<AddItem />);

      await screen.findByRole("heading", { name: "Add Item" });
      fireEvent.change(screen.getByPlaceholderText("What is this item?"), {
        target: { value: "Drill" },
      });
      // Don't fill in the brand facet
      fireEvent.submit(screen.getByRole("button", { name: "Add Item" }).closest("form")!);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard/library/lib-1");
      });
      // Only called once for item creation, not for facet
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe("barcode scanner", () => {
    it("renders scan barcode button", async () => {
      setupLibraryLoad();

      renderWithProviders(<AddItem />);

      const scanBtn = await screen.findByRole("button", { name: /Scan Barcode/i });
      expect(scanBtn).toBeInTheDocument();
      expect(scanBtn).toHaveTextContent("Scan Barcode (ISBN / UPC)");
    });

    it("shows scanner component when scan button clicked", async () => {
      setupLibraryLoad();

      renderWithProviders(<AddItem />);

      await screen.findByRole("heading", { name: "Add Item" });
      fireEvent.click(screen.getByRole("button", { name: /Scan Barcode/i }));

      expect(screen.getByTestId("barcode-scanner")).toBeInTheDocument();
    });

    it("hides scanner and shows loading when barcode detected (ISBN)", async () => {
      setupLibraryLoad();
      mockFormatBarcodeResult.mockResolvedValueOnce({
        name: "Effective Java by Joshua Bloch",
        description: "ISBN: 9780134685991",
      });

      renderWithProviders(<AddItem />);

      await screen.findByRole("heading", { name: "Add Item" });
      fireEvent.click(screen.getByRole("button", { name: /Scan Barcode/i }));

      // Simulate barcode scan
      fireEvent.click(screen.getByText("Simulate Scan"));

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText("Looking up barcode...")).toBeInTheDocument();
      });

      // formatBarcodeResult called with correct code and format
      expect(mockFormatBarcodeResult).toHaveBeenCalledWith("9780134685991", "ean_13");

      // After lookup completes, name and description should be filled
      await waitFor(() => {
        expect((screen.getByPlaceholderText("What is this item?") as HTMLInputElement).value)
          .toBe("Effective Java by Joshua Bloch");
      });

      await waitFor(() => {
        expect((screen.getByPlaceholderText("Any details about this item...") as HTMLTextAreaElement).value)
          .toBe("ISBN: 9780134685991");
      });
    });

    it("shows error toast when barcode lookup fails", async () => {
      setupLibraryLoad();
      mockFormatBarcodeResult.mockRejectedValueOnce(new Error("Network error"));

      renderWithProviders(<AddItem />);

      await screen.findByRole("heading", { name: "Add Item" });
      fireEvent.click(screen.getByRole("button", { name: /Scan Barcode/i }));

      // Simulate barcode scan
      fireEvent.click(screen.getByText("Simulate Scan"));

      // Should show error toast
      await waitFor(() => {
        expect(screen.getByText("Couldn't look up barcode")).toBeInTheDocument();
      });

      // Name and description should remain empty
      expect((screen.getByPlaceholderText("What is this item?") as HTMLInputElement).value).toBe("");
    });

    it("closes scanner when cancel clicked", async () => {
      setupLibraryLoad();

      renderWithProviders(<AddItem />);

      await screen.findByRole("heading", { name: "Add Item" });
      fireEvent.click(screen.getByRole("button", { name: /Scan Barcode/i }));

      expect(screen.getByTestId("barcode-scanner")).toBeInTheDocument();

      // Click cancel
      fireEvent.click(screen.getByText("Cancel"));

      // Scanner should be gone, scan button should be back
      expect(screen.queryByTestId("barcode-scanner")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Scan Barcode/i })).toBeInTheDocument();
    });
  });
});
