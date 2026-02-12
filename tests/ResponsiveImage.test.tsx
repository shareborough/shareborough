/**
 * ResponsiveImage component tests.
 * Verifies srcset generation, sizes attribute, lazy loading, and data URL handling.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ResponsiveImage from "../src/components/ResponsiveImage";

// VITE_AYB_URL is set in .env.test — relative /api/ paths get resolved to this base
const API_BASE = import.meta.env.VITE_AYB_URL ?? "";

describe("ResponsiveImage", () => {
  describe("Remote images (srcset enabled)", () => {
    it("renders img with src resolved to API base URL", () => {
      render(<ResponsiveImage src="/api/storage/items/photo.jpg" alt="Test item" />);

      const img = screen.getByAltText("Test item");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", `${API_BASE}/api/storage/items/photo.jpg`);
    });

    it("generates srcset with 5 width variants", () => {
      render(<ResponsiveImage src="/api/storage/items/photo.jpg" alt="Test item" />);

      const img = screen.getByAltText("Test item");
      const srcset = img.getAttribute("srcset");

      expect(srcset).toBeTruthy();
      expect(srcset).toContain("375w");
      expect(srcset).toContain("640w");
      expect(srcset).toContain("768w");
      expect(srcset).toContain("1024w");
      expect(srcset).toContain("1280w");
    });

    it("includes width query params in srcset URLs with API base", () => {
      render(<ResponsiveImage src="/api/storage/items/photo.jpg" alt="Test item" />);

      const img = screen.getByAltText("Test item");
      const srcset = img.getAttribute("srcset");

      expect(srcset).toContain(`${API_BASE}/api/storage/items/photo.jpg?w=375`);
      expect(srcset).toContain("?w=640");
      expect(srcset).toContain("?w=768");
      expect(srcset).toContain("?w=1024");
      expect(srcset).toContain("?w=1280");
    });

    it("sets default sizes attribute for responsive selection", () => {
      render(<ResponsiveImage src="/api/storage/items/photo.jpg" alt="Test item" />);

      const img = screen.getByAltText("Test item");
      expect(img).toHaveAttribute("sizes", "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw");
    });

    it("allows custom sizes attribute", () => {
      render(
        <ResponsiveImage
          src="/api/storage/items/photo.jpg"
          alt="Test item"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      );

      const img = screen.getByAltText("Test item");
      expect(img).toHaveAttribute("sizes", "(max-width: 768px) 100vw, 50vw");
    });

    it("uses lazy loading by default", () => {
      render(<ResponsiveImage src="/api/storage/items/photo.jpg" alt="Test item" />);

      const img = screen.getByAltText("Test item");
      expect(img).toHaveAttribute("loading", "lazy");
    });

    it("uses async decoding by default", () => {
      render(<ResponsiveImage src="/api/storage/items/photo.jpg" alt="Test item" />);

      const img = screen.getByAltText("Test item");
      expect(img).toHaveAttribute("decoding", "async");
    });

    it("allows eager loading override", () => {
      render(<ResponsiveImage src="/api/storage/items/photo.jpg" alt="Test item" loading="eager" />);

      const img = screen.getByAltText("Test item");
      expect(img).toHaveAttribute("loading", "eager");
    });

    it("allows sync decoding override", () => {
      render(<ResponsiveImage src="/api/storage/items/photo.jpg" alt="Test item" decoding="sync" />);

      const img = screen.getByAltText("Test item");
      expect(img).toHaveAttribute("decoding", "sync");
    });

    it("applies custom className", () => {
      render(
        <ResponsiveImage
          src="/api/storage/items/photo.jpg"
          alt="Test item"
          className="w-full h-full object-cover"
        />
      );

      const img = screen.getByAltText("Test item");
      expect(img).toHaveClass("w-full", "h-full", "object-cover");
    });

    it("works with absolute URLs", () => {
      render(<ResponsiveImage src="https://example.com/photo.jpg" alt="Test item" />);

      const img = screen.getByAltText("Test item");
      expect(img).toHaveAttribute("src", "https://example.com/photo.jpg");

      const srcset = img.getAttribute("srcset");
      expect(srcset).toContain("https://example.com/photo.jpg?w=375");
      expect(srcset).toContain("https://example.com/photo.jpg?w=640");
    });
  });

  describe("Data URLs (srcset disabled)", () => {
    it("renders data URL without srcset", () => {
      const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      render(<ResponsiveImage src={dataUrl} alt="Preview" />);

      const img = screen.getByAltText("Preview");
      expect(img).toHaveAttribute("src", dataUrl);
      expect(img).not.toHaveAttribute("srcset");
    });

    it("renders data URL without sizes attribute", () => {
      const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      render(<ResponsiveImage src={dataUrl} alt="Preview" />);

      const img = screen.getByAltText("Preview");
      expect(img).not.toHaveAttribute("sizes");
    });

    it("renders data URL without lazy loading", () => {
      const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      render(<ResponsiveImage src={dataUrl} alt="Preview" />);

      const img = screen.getByAltText("Preview");
      expect(img).not.toHaveAttribute("loading");
    });

    it("renders data URL without async decoding", () => {
      const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      render(<ResponsiveImage src={dataUrl} alt="Preview" />);

      const img = screen.getByAltText("Preview");
      expect(img).not.toHaveAttribute("decoding");
    });

    it("applies className to data URL images", () => {
      const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      render(<ResponsiveImage src={dataUrl} alt="Preview" className="w-full" />);

      const img = screen.getByAltText("Preview");
      expect(img).toHaveClass("w-full");
    });
  });

  describe("Edge cases", () => {
    it("handles empty src gracefully", () => {
      render(<ResponsiveImage src="" alt="Empty" />);

      const img = screen.getByAltText("Empty");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "");
      expect(img).not.toHaveAttribute("srcset");
    });

    it("preserves existing query params when adding width param", () => {
      render(<ResponsiveImage src="/api/storage/items/photo.jpg?token=abc123" alt="Test item" />);

      const img = screen.getByAltText("Test item");
      const srcset = img.getAttribute("srcset");
      const src = img.getAttribute("src");

      // Resolved to API base URL
      expect(src).toContain(`${API_BASE}/api/storage/items/photo.jpg`);
      // Should have both token and w params
      expect(srcset).toContain("token=abc123");
      expect(srcset).toContain("w=375");
    });
  });

  describe("Behavior-driven scenarios", () => {
    it("mobile user (375px): browser can select 375w variant", () => {
      render(<ResponsiveImage src="/api/storage/items/photo.jpg" alt="Test item" />);

      const img = screen.getByAltText("Test item");
      const srcset = img.getAttribute("srcset");
      const sizes = img.getAttribute("sizes");

      // srcset includes 375w variant (resolved to API base)
      expect(srcset).toContain("w=375 375w");
      // sizes tells browser to use 100vw on small screens
      expect(sizes).toContain("(max-width: 640px) 100vw");
    });

    it("tablet user (768px): browser can select 640w or 768w variant", () => {
      render(<ResponsiveImage src="/api/storage/items/photo.jpg" alt="Test item" />);

      const img = screen.getByAltText("Test item");
      const srcset = img.getAttribute("srcset");
      const sizes = img.getAttribute("sizes");

      // srcset includes both variants (resolved to API base)
      expect(srcset).toContain("w=640 640w");
      expect(srcset).toContain("w=768 768w");
      // sizes tells browser to use 50vw on medium screens
      expect(sizes).toContain("(max-width: 1024px) 50vw");
    });

    it("desktop user (1920px): browser can select 1280w variant", () => {
      render(<ResponsiveImage src="/api/storage/items/photo.jpg" alt="Test item" />);

      const img = screen.getByAltText("Test item");
      const srcset = img.getAttribute("srcset");
      const sizes = img.getAttribute("sizes");

      // srcset includes 1280w variant (resolved to API base)
      expect(srcset).toContain("w=1280 1280w");
      // sizes tells browser to use 33vw on large screens
      expect(sizes).toContain("33vw");
    });

    it("preview image (AddItem): no srcset or lazy loading", () => {
      const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      render(<ResponsiveImage src={dataUrl} alt="Photo preview" />);

      const img = screen.getByAltText("Photo preview");
      expect(img).not.toHaveAttribute("srcset");
      expect(img).not.toHaveAttribute("loading");
      expect(img).not.toHaveAttribute("decoding");
    });
  });
});
