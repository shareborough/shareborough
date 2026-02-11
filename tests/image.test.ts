import { processImage, createPreview } from "../src/lib/image";

// Mock createImageBitmap
const mockBitmap = {
  width: 800,
  height: 600,
  close: vi.fn(),
};
vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(mockBitmap));

// Mock canvas and context
const mockCtx = {
  drawImage: vi.fn(),
};
const mockToBlob = vi.fn();
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn().mockReturnValue(mockCtx),
  toBlob: mockToBlob,
};

vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
  if (tag === "canvas") return mockCanvas as unknown as HTMLCanvasElement;
  return document.createElement(tag);
});

describe("processImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBitmap.width = 800;
    mockBitmap.height = 600;
    mockCanvas.getContext.mockReturnValue(mockCtx);
    mockToBlob.mockImplementation(
      (cb: (b: Blob | null) => void, _type: string, _quality: number) => {
        cb(new Blob(["fake-jpeg"], { type: "image/jpeg" }));
      },
    );
  });

  it("passes through small accepted-type files without processing", async () => {
    const file = new File(["small"], "photo.jpg", { type: "image/jpeg" });
    // File size is < 500KB and type is accepted
    Object.defineProperty(file, "size", { value: 100_000 });

    const result = await processImage(file);
    expect(result).toBe(file);
    expect(createImageBitmap).not.toHaveBeenCalled();
  });

  it("re-encodes large JPEG files", async () => {
    const file = new File(["large-content"], "big.jpg", { type: "image/jpeg" });
    Object.defineProperty(file, "size", { value: 600_000 });

    const result = await processImage(file);

    expect(createImageBitmap).toHaveBeenCalledWith(file);
    expect(result.type).toBe("image/jpeg");
    expect(result.name).toBe("big.jpg");
  });

  it("re-encodes PNG files over 500KB", async () => {
    const file = new File(["large-png"], "image.png", { type: "image/png" });
    Object.defineProperty(file, "size", { value: 700_000 });

    const result = await processImage(file);

    expect(createImageBitmap).toHaveBeenCalledWith(file);
    expect(result.name).toBe("image.jpg");
    expect(result.type).toBe("image/jpeg");
  });

  it("processes non-standard MIME types (e.g. HEIC)", async () => {
    const file = new File(["heic-content"], "photo.heic", { type: "image/heic" });
    Object.defineProperty(file, "size", { value: 100_000 });

    const result = await processImage(file);

    expect(createImageBitmap).toHaveBeenCalledWith(file);
    expect(result.name).toBe("photo.jpg");
    expect(result.type).toBe("image/jpeg");
  });

  it("scales down images exceeding max dimension (width)", async () => {
    mockBitmap.width = 3200;
    mockBitmap.height = 2400;
    const file = new File(["huge"], "huge.jpg", { type: "image/jpeg" });
    Object.defineProperty(file, "size", { value: 600_000 });

    await processImage(file);

    // Should scale to 1600x1200 (ratio = 1600/3200 = 0.5)
    expect(mockCanvas.width).toBe(1600);
    expect(mockCanvas.height).toBe(1200);
  });

  it("scales down images exceeding max dimension (height)", async () => {
    mockBitmap.width = 1200;
    mockBitmap.height = 3200;
    const file = new File(["tall"], "tall.png", { type: "image/png" });
    Object.defineProperty(file, "size", { value: 600_000 });

    await processImage(file);

    // Ratio = 1600/3200 = 0.5, so 600x1600
    expect(mockCanvas.width).toBe(600);
    expect(mockCanvas.height).toBe(1600);
  });

  it("does not upscale small images", async () => {
    mockBitmap.width = 400;
    mockBitmap.height = 300;
    const file = new File(["unknown"], "photo.heic", { type: "image/heic" });
    Object.defineProperty(file, "size", { value: 100_000 });

    await processImage(file);

    expect(mockCanvas.width).toBe(400);
    expect(mockCanvas.height).toBe(300);
  });

  it("closes bitmap after processing", async () => {
    const file = new File(["content"], "photo.heic", { type: "image/heic" });
    Object.defineProperty(file, "size", { value: 100_000 });

    await processImage(file);

    expect(mockBitmap.close).toHaveBeenCalledTimes(1);
  });

  it("throws when canvas context is unavailable", async () => {
    mockCanvas.getContext.mockReturnValue(null);
    const file = new File(["content"], "photo.heic", { type: "image/heic" });
    Object.defineProperty(file, "size", { value: 100_000 });

    await expect(processImage(file)).rejects.toThrow("Canvas not supported");
  });

  it("throws when toBlob returns null", async () => {
    mockToBlob.mockImplementation(
      (cb: (b: Blob | null) => void) => cb(null),
    );
    const file = new File(["content"], "photo.heic", { type: "image/heic" });
    Object.defineProperty(file, "size", { value: 100_000 });

    await expect(processImage(file)).rejects.toThrow("Image conversion failed");
  });

  it("strips original extension and appends .jpg", async () => {
    const file = new File(["content"], "my-photo.HEIC", { type: "image/heic" });
    Object.defineProperty(file, "size", { value: 100_000 });

    const result = await processImage(file);
    expect(result.name).toBe("my-photo.jpg");
  });
});

describe("createPreview", () => {
  it("returns a data URL from FileReader", async () => {
    expect.assertions(1);
    const file = new File(["hello"], "test.jpg", { type: "image/jpeg" });
    const url = await createPreview(file);
    // FileReader.readAsDataURL returns a base64 data URL
    expect(url).toMatch(/^data:/);
  });
});
