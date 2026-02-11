import { render, screen } from "@testing-library/react";
import Avatar, { getInitials, getColor } from "../src/components/Avatar";

describe("Avatar", () => {
  // --- getInitials ---

  describe("getInitials", () => {
    it("returns single initial for single name", () => {
      expect(getInitials("Alice")).toBe("A");
    });

    it("returns two initials for full name", () => {
      expect(getInitials("Alice Smith")).toBe("AS");
    });

    it("uses first and last for multi-word names", () => {
      expect(getInitials("Mary Jane Watson")).toBe("MW");
    });

    it("returns ? for empty string", () => {
      expect(getInitials("")).toBe("?");
    });

    it("uppercases initials", () => {
      expect(getInitials("alice smith")).toBe("AS");
    });

    it("handles whitespace-only input", () => {
      expect(getInitials("   ")).toBe("?");
    });
  });

  // --- getColor ---

  describe("getColor", () => {
    it("returns consistent color for same name", () => {
      const color1 = getColor("Alice");
      const color2 = getColor("Alice");
      expect(color1).toBe(color2);
    });

    it("returns different colors for different names", () => {
      // While not guaranteed, most distinct names should hash differently
      const colors = new Set([
        getColor("Alice"),
        getColor("Bob"),
        getColor("Charlie"),
        getColor("Diana"),
      ]);
      expect(colors.size).toBeGreaterThan(1);
    });

    it("returns a value from the known COLORS palette", () => {
      const VALID_COLORS = [
        "bg-sage-200 text-sage-700",
        "bg-amber-200 text-amber-700",
        "bg-blue-200 text-blue-700",
        "bg-rose-200 text-rose-700",
        "bg-violet-200 text-violet-700",
        "bg-emerald-200 text-emerald-700",
        "bg-orange-200 text-orange-700",
        "bg-cyan-200 text-cyan-700",
      ];
      // Check multiple names to exercise the hash
      for (const name of ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank"]) {
        expect(VALID_COLORS).toContain(getColor(name));
      }
    });
  });

  // --- Component rendering ---

  describe("rendering", () => {
    it("renders initials avatar when no image", () => {
      render(<Avatar name="Alice Smith" />);
      expect(screen.getByText("AS")).toBeInTheDocument();
    });

    it("renders image when imageUrl provided", () => {
      render(<Avatar name="Alice" imageUrl="/avatars/alice.jpg" />);
      const img = screen.getByAltText("Alice");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "/avatars/alice.jpg");
    });

    it("applies size classes for sm", () => {
      const { container } = render(<Avatar name="Bob" size="sm" />);
      expect(container.firstChild).toHaveClass("w-8", "h-8");
    });

    it("applies size classes for lg", () => {
      const { container } = render(<Avatar name="Bob" size="lg" />);
      expect(container.firstChild).toHaveClass("w-16", "h-16");
    });

    it("includes aria-label with name", () => {
      render(<Avatar name="Carol" />);
      expect(screen.getByLabelText("Carol")).toBeInTheDocument();
    });

    it("renders rounded-full for both variants", () => {
      const { container: c1 } = render(<Avatar name="A" />);
      expect(c1.firstChild).toHaveClass("rounded-full");

      const { container: c2 } = render(<Avatar name="B" imageUrl="/img.jpg" />);
      expect(c2.firstChild).toHaveClass("rounded-full");
    });
  });
});
