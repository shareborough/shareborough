import { screen } from "@testing-library/react";
import { renderWithProviders } from "./testHelpers";

/**
 * Image optimization tests — verify all item images use lazy loading
 * and async decoding for better performance.
 */

// === LibraryDetail images ===
const mockLibDetailList = vi.fn();
const mockLibDetailGet = vi.fn();
vi.mock("../src/lib/ayb", () => ({
  ayb: {
    records: {
      list: (...args: unknown[]) => mockLibDetailList(...args),
      get: (...args: unknown[]) => mockLibDetailGet(...args),
    },
    realtime: {
      subscribe: vi.fn(() => () => {}),
    },
  },
  isLoggedIn: () => true,
}));

vi.mock("../src/lib/rpc", () => ({
  rpc: vi.fn(),
}));

vi.mock("../src/lib/reminders", () => ({
  scheduleReminders: vi.fn().mockResolvedValue(6),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: "lib-1", slug: "test-lib", itemId: "item-1" }),
  };
});

describe("Image Optimization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("LibraryDetail images", () => {
    it("item images have loading=lazy and decoding=async", async () => {
      const LibraryDetail = (await import("../src/pages/LibraryDetail")).default;

      mockLibDetailGet.mockResolvedValueOnce({
        id: "lib-1",
        name: "Test Library",
        slug: "test-lib",
        description: null,
        is_public: true,
        show_borrower_names: false,
        show_return_dates: false,
      });
      // items
      mockLibDetailList.mockResolvedValueOnce({
        items: [
          { id: "item-1", library_id: "lib-1", name: "Photo Item", photo_url: "/photos/test.jpg", status: "available" },
        ],
      });
      // facet definitions
      mockLibDetailList.mockResolvedValueOnce({ items: [] });
      // item facets
      mockLibDetailList.mockResolvedValueOnce({ items: [] });
      // loans
      mockLibDetailList.mockResolvedValueOnce({ items: [] });
      // circles
      mockLibDetailList.mockResolvedValueOnce({ items: [] });

      renderWithProviders(<LibraryDetail />);

      const img = await screen.findByAltText("Photo Item");
      expect(img).toHaveAttribute("loading", "lazy");
      expect(img).toHaveAttribute("decoding", "async");
      expect(img).toHaveAttribute("srcset");
      expect(img.getAttribute("srcset")).toContain("375w");
      expect(img.getAttribute("srcset")).toContain("640w");
      expect(img).toHaveAttribute("sizes");
    });
  });

  describe("PublicLibrary images", () => {
    it("item images have loading=lazy and decoding=async", async () => {
      const PublicLibrary = (await import("../src/pages/PublicLibrary")).default;

      // library lookup
      mockLibDetailList.mockResolvedValueOnce({
        items: [
          { id: "lib-1", name: "Public Lib", slug: "test-lib", description: null, is_public: true },
        ],
      });
      // items
      mockLibDetailList.mockResolvedValueOnce({
        items: [
          { id: "item-1", library_id: "lib-1", name: "Public Item", photo_url: "/photos/pub.jpg", status: "available" },
        ],
      });
      // facet defs
      mockLibDetailList.mockResolvedValueOnce({ items: [] });
      // item facets
      mockLibDetailList.mockResolvedValueOnce({ items: [] });
      // loans
      mockLibDetailList.mockResolvedValueOnce({ items: [] });

      renderWithProviders(<PublicLibrary />);

      const img = await screen.findByAltText("Public Item");
      expect(img).toHaveAttribute("loading", "lazy");
      expect(img).toHaveAttribute("decoding", "async");
      expect(img).toHaveAttribute("srcset");
      expect(img.getAttribute("srcset")).toContain("375w");
      expect(img.getAttribute("srcset")).toContain("640w");
      expect(img).toHaveAttribute("sizes");
    });
  });

  describe("PublicItem images", () => {
    it("item image has loading=lazy and decoding=async", async () => {
      const PublicItem = (await import("../src/pages/PublicItem")).default;

      // library lookup
      mockLibDetailList.mockResolvedValueOnce({
        items: [
          { id: "lib-1", name: "Pub Lib", slug: "test-lib", description: null, is_public: true },
        ],
      });
      // item get
      mockLibDetailGet.mockResolvedValueOnce({
        id: "item-1",
        library_id: "lib-1",
        name: "Detail Item",
        description: "A nice item",
        photo_url: "/photos/detail.jpg",
        status: "available",
        max_borrow_days: null,
      });
      // facet defs
      mockLibDetailList.mockResolvedValueOnce({ items: [] });
      // item facets
      mockLibDetailList.mockResolvedValueOnce({ items: [] });

      renderWithProviders(<PublicItem />);

      const img = await screen.findByAltText("Detail Item");
      expect(img).toHaveAttribute("loading", "lazy");
      expect(img).toHaveAttribute("decoding", "async");
      expect(img).toHaveAttribute("srcset");
      expect(img.getAttribute("srcset")).toContain("375w");
      expect(img.getAttribute("srcset")).toContain("640w");
      expect(img).toHaveAttribute("sizes");
    });
  });

  describe("Source code verification", () => {
    it("remote item images in page components use ResponsiveImage", async () => {
      const fs = await import("fs");
      const path = await import("path");

      // Pages that display remote item images (photo_url from server)
      const imagePages = [
        "LibraryDetail.tsx",
        "PublicLibrary.tsx",
        "PublicItem.tsx",
      ];

      const pagesDir = path.resolve(__dirname, "../src/pages");

      for (const file of imagePages) {
        const content = fs.readFileSync(path.join(pagesDir, file), "utf-8");

        // Verify ResponsiveImage is imported
        expect(content).toContain('import ResponsiveImage from "../components/ResponsiveImage"');

        // Verify ResponsiveImage is used with photo_url
        const responsiveImgMatch = content.match(/<ResponsiveImage\s[^>]*src=\{item\.photo_url\}[^>]*/g);
        expect(responsiveImgMatch).toBeTruthy();
        expect(responsiveImgMatch!.length).toBeGreaterThan(0);
      }
    });

    it("AddItem preview image does NOT use lazy loading (client-side data URL)", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const addItemPath = path.resolve(__dirname, "../src/pages/AddItem.tsx");
      const content = fs.readFileSync(addItemPath, "utf-8");

      // Preview image uses a data URL — lazy loading would be counterproductive
      const previewImgMatch = content.match(/<img\s[^>]*src=\{photoPreview\}[^>]*/);
      if (previewImgMatch) {
        expect(previewImgMatch[0]).not.toContain('loading="lazy"');
      }
    });
  });
});
