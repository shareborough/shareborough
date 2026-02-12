/**
 * Barcode utilities: ISBN lookup via Open Library API.
 */

interface BookInfo {
  title: string;
  authors: string[];
  isbn: string;
}

/**
 * Check if a barcode looks like an ISBN (10 or 13 digits starting with 978/979).
 */
export function isISBN(code: string): boolean {
  const digits = code.replace(/[^0-9X]/gi, "");
  if (digits.length === 13 && (digits.startsWith("978") || digits.startsWith("979"))) {
    return true;
  }
  if (digits.length === 10) {
    return true;
  }
  return false;
}

/**
 * Look up a book by ISBN using the Open Library API (free, no key needed).
 * Returns null if not found or on error.
 */
export async function lookupISBN(isbn: string): Promise<BookInfo | null> {
  try {
    const res = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;

    const data = await res.json();
    const key = `ISBN:${isbn}`;
    const book = data[key];
    if (!book) return null;

    return {
      title: book.title ?? "",
      authors: (book.authors ?? []).map((a: { name: string }) => a.name),
      isbn,
    };
  } catch {
    return null;
  }
}

/**
 * Format a barcode result into a human-readable item name.
 * For ISBNs, returns "Title by Author". For other codes, returns the raw code.
 */
export async function formatBarcodeResult(
  code: string,
  format: string,
): Promise<{ name: string; description: string }> {
  if (isISBN(code)) {
    const book = await lookupISBN(code);
    if (book) {
      const authorStr = book.authors.length > 0 ? ` by ${book.authors.join(", ")}` : "";
      return {
        name: `${book.title}${authorStr}`,
        description: `ISBN: ${code}`,
      };
    }
    return {
      name: "",
      description: `ISBN: ${code}`,
    };
  }

  return {
    name: "",
    description: `Barcode: ${code} (${format})`,
  };
}
