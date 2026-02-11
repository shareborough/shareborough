import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChunkErrorBoundary from "../src/components/ChunkErrorBoundary";

// Component that throws an error on mount
function ThrowError({ error }: { error: Error }): null {
  throw error;
}

describe("ChunkErrorBoundary Component", () => {
  // Suppress console.error for these tests (error boundary logs intentionally)
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  describe("Chunk load error detection", () => {
    it("should catch ChunkLoadError and show retry UI", () => {
      const error = new Error("Loading chunk 42 failed");
      error.name = "ChunkLoadError";

      render(
        <ChunkErrorBoundary>
          <ThrowError error={error} />
        </ChunkErrorBoundary>,
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/couldn't load this page/i)).toBeInTheDocument();
    });

    it("should catch dynamic import failures", () => {
      const error = new Error("Failed to fetch dynamically imported module");

      render(
        <ChunkErrorBoundary>
          <ThrowError error={error} />
        </ChunkErrorBoundary>,
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it("should catch module script failures", () => {
      const error = new Error("Importing a module script failed");

      render(
        <ChunkErrorBoundary>
          <ThrowError error={error} />
        </ChunkErrorBoundary>,
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/reload page/i)).toBeInTheDocument();
    });

    it("should NOT catch non-chunk errors (let them bubble up)", () => {
      const error = new Error("Regular error");

      // Non-chunk errors should throw (not be caught)
      expect(() => {
        render(
          <ChunkErrorBoundary>
            <ThrowError error={error} />
          </ChunkErrorBoundary>,
        );
      }).toThrow("Regular error");
    });
  });

  describe("Error UI content", () => {
    it("should show warning emoji", () => {
      const error = new Error("Failed to fetch dynamically imported module");

      render(
        <ChunkErrorBoundary>
          <ThrowError error={error} />
        </ChunkErrorBoundary>,
      );

      expect(screen.getByText("⚠️")).toBeInTheDocument();
    });

    it("should show helpful error message", () => {
      const error = new Error("ChunkLoadError");
      error.name = "ChunkLoadError";

      render(
        <ChunkErrorBoundary>
          <ThrowError error={error} />
        </ChunkErrorBoundary>,
      );

      expect(
        screen.getByText(/this might be due to a network issue/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/outdated version/i)).toBeInTheDocument();
    });

    it("should show reload button", () => {
      const error = new Error("Failed to fetch dynamically imported module");

      render(
        <ChunkErrorBoundary>
          <ThrowError error={error} />
        </ChunkErrorBoundary>,
      );

      const button = screen.getByRole("button", { name: /reload page/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass("btn-primary");
    });

    it("should show cache clearing hint", () => {
      const error = new Error("ChunkLoadError");
      error.name = "ChunkLoadError";

      render(
        <ChunkErrorBoundary>
          <ThrowError error={error} />
        </ChunkErrorBoundary>,
      );

      expect(screen.getByText(/clearing your browser cache/i)).toBeInTheDocument();
    });
  });

  describe("Reload functionality", () => {
    it("should reload page when button clicked", () => {
      const error = new Error("Failed to fetch dynamically imported module");
      const reloadSpy = vi.fn();
      Object.defineProperty(window, "location", {
        value: { reload: reloadSpy },
        writable: true,
      });

      render(
        <ChunkErrorBoundary>
          <ThrowError error={error} />
        </ChunkErrorBoundary>,
      );

      const button = screen.getByRole("button", { name: /reload page/i });
      fireEvent.click(button);

      expect(reloadSpy).toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("should have role=alert for error state", () => {
      const error = new Error("ChunkLoadError");
      error.name = "ChunkLoadError";

      render(
        <ChunkErrorBoundary>
          <ThrowError error={error} />
        </ChunkErrorBoundary>,
      );

      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("aria-live", "assertive");
    });

    it("should have descriptive aria-label on reload button", () => {
      const error = new Error("Failed to fetch dynamically imported module");

      render(
        <ChunkErrorBoundary>
          <ThrowError error={error} />
        </ChunkErrorBoundary>,
      );

      const button = screen.getByRole("button", {
        name: /reload page to fix error/i,
      });
      expect(button).toBeInTheDocument();
    });
  });

  describe("Normal rendering (no error)", () => {
    it("should render children when no error", () => {
      render(
        <ChunkErrorBoundary>
          <div>Normal content</div>
        </ChunkErrorBoundary>,
      );

      expect(screen.getByText("Normal content")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
