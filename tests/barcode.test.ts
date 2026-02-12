import { describe, it, expect, vi, beforeEach } from "vitest";
import { isISBN, lookupISBN, formatBarcodeResult } from "../src/lib/barcode";

describe("barcode utilities", () => {
  describe("isISBN", () => {
    it("recognizes 13-digit ISBN starting with 978", () => {
      expect(isISBN("9780134685991")).toBe(true);
    });

    it("recognizes 13-digit ISBN starting with 979", () => {
      expect(isISBN("9791234567890")).toBe(true);
    });

    it("recognizes 10-digit ISBN", () => {
      expect(isISBN("0134685997")).toBe(true);
    });

    it("recognizes 10-digit ISBN ending with X", () => {
      expect(isISBN("155860832X")).toBe(true);
    });

    it("rejects 12-digit UPC code", () => {
      expect(isISBN("012345678905")).toBe(false);
    });

    it("rejects random 13-digit code not starting with 978/979", () => {
      expect(isISBN("1234567890123")).toBe(false);
    });

    it("rejects short codes", () => {
      expect(isISBN("12345")).toBe(false);
    });

    it("handles hyphens in ISBN", () => {
      expect(isISBN("978-0-13-468599-1")).toBe(true);
    });
  });

  describe("lookupISBN", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("returns book info for a valid ISBN", async () => {
      const mockResponse = {
        "ISBN:9780134685991": {
          title: "Effective Java",
          authors: [{ name: "Joshua Bloch" }],
        },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await lookupISBN("9780134685991");
      expect(result).not.toBeNull();
      expect(result!.title).toBe("Effective Java");
      expect(result!.authors).toEqual(["Joshua Bloch"]);
      expect(result!.isbn).toBe("9780134685991");
    });

    it("returns null when ISBN not found", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      const result = await lookupISBN("0000000000000");
      expect(result).toBeNull();
    });

    it("returns null on network error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

      const result = await lookupISBN("9780134685991");
      expect(result).toBeNull();
    });

    it("returns null on HTTP error", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const result = await lookupISBN("9780134685991");
      expect(result).toBeNull();
    });

    it("handles book with no authors", async () => {
      const mockResponse = {
        "ISBN:9780000000000": {
          title: "Unknown Book",
        },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await lookupISBN("9780000000000");
      expect(result).not.toBeNull();
      expect(result!.title).toBe("Unknown Book");
      expect(result!.authors).toEqual([]);
    });
  });

  describe("formatBarcodeResult", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("formats ISBN with book lookup", async () => {
      const mockResponse = {
        "ISBN:9780134685991": {
          title: "Effective Java",
          authors: [{ name: "Joshua Bloch" }],
        },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await formatBarcodeResult("9780134685991", "ean_13");
      expect(result.name).toBe("Effective Java by Joshua Bloch");
      expect(result.description).toBe("ISBN: 9780134685991");
    });

    it("formats ISBN when book not found", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      const result = await formatBarcodeResult("9780000000000", "ean_13");
      expect(result.name).toBe("");
      expect(result.description).toBe("ISBN: 9780000000000");
    });

    it("formats non-ISBN barcode with code and format", async () => {
      const result = await formatBarcodeResult("012345678905", "upc_a");
      expect(result.name).toBe("");
      expect(result.description).toBe("Barcode: 012345678905 (upc_a)");
    });

    it("formats ISBN with multiple authors", async () => {
      const mockResponse = {
        "ISBN:9780000000001": {
          title: "Co-authored Book",
          authors: [{ name: "Author One" }, { name: "Author Two" }],
        },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await formatBarcodeResult("9780000000001", "ean_13");
      expect(result.name).toBe("Co-authored Book by Author One, Author Two");
    });
  });
});
