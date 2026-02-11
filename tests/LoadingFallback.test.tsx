import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import LoadingFallback from "../src/components/LoadingFallback";

describe("LoadingFallback Component", () => {
  describe("Accessibility", () => {
    it("should have aria-label for page variant", () => {
      const { container } = render(<LoadingFallback route="dashboard" variant="page" />);
      expect(container.firstChild).toHaveAttribute("aria-label", "Loading dashboard");
    });

    it("should have aria-label for form variant", () => {
      const { container } = render(<LoadingFallback route="settings" variant="form" />);
      expect(container.firstChild).toHaveAttribute("aria-label", "Loading settings");
    });

    it("should have aria-label for dashboard variant", () => {
      const { container } = render(<LoadingFallback route="libraries" variant="dashboard" />);
      expect(container.firstChild).toHaveAttribute("aria-label", "Loading libraries");
    });

    it("should default to 'page' in aria-label when route not specified", () => {
      const { container } = render(<LoadingFallback />);
      expect(container.firstChild).toHaveAttribute("aria-label", "Loading page");
    });
  });

  describe("Dashboard variant layout", () => {
    it("should render grid of skeleton cards", () => {
      const { container } = render(<LoadingFallback variant="dashboard" />);

      // Dashboard variant has a grid of 6 cards + 1 title = 7 skeletons
      const skeletons = container.querySelectorAll('[aria-hidden="true"]');
      expect(skeletons.length).toBe(7); // 1 title + 6 cards
    });

    it("should have title skeleton", () => {
      const { container } = render(<LoadingFallback variant="dashboard" />);

      const skeletons = container.querySelectorAll('[aria-hidden="true"]');
      // First skeleton is the title (h-10 w-64)
      expect(skeletons[0]).toHaveClass("h-10", "w-64");
    });
  });

  describe("Form variant layout", () => {
    it("should render form-like skeleton structure", () => {
      const { container } = render(<LoadingFallback variant="form" />);

      // Form variant has title + 4 form fields
      const skeletons = container.querySelectorAll('[aria-hidden="true"]');
      expect(skeletons.length).toBe(5); // 1 title + 4 fields
    });

    it("should have centered max-width container", () => {
      const { container } = render(<LoadingFallback variant="form" />);

      const wrapper = container.querySelector(".max-w-lg");
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe("Page variant layout (default)", () => {
    it("should render generic page layout", () => {
      const { container } = render(<LoadingFallback variant="page" />);

      // Page variant has title + 2 text lines + content block
      const skeletons = container.querySelectorAll('[aria-hidden="true"]');
      expect(skeletons.length).toBe(4);
    });

    it("should use page variant by default", () => {
      const { container: container1 } = render(<LoadingFallback />);
      const { container: container2 } = render(<LoadingFallback variant="page" />);

      // Both should have same number of skeletons
      const skeletons1 = container1.querySelectorAll('[aria-hidden="true"]');
      const skeletons2 = container2.querySelectorAll('[aria-hidden="true"]');
      expect(skeletons1.length).toBe(skeletons2.length);
    });
  });

  describe("Background styling", () => {
    it("should have warm-50 background color", () => {
      const { container } = render(<LoadingFallback />);
      expect(container.firstChild).toHaveClass("bg-warm-50");
    });

    it("should have min-h-screen for full viewport height", () => {
      const { container } = render(<LoadingFallback />);
      expect(container.firstChild).toHaveClass("min-h-screen");
    });
  });

  describe("Skeleton shimmer animation", () => {
    it("should render Skeleton components with aria-hidden", () => {
      const { container } = render(<LoadingFallback variant="dashboard" />);

      // All skeletons should have aria-hidden="true"
      const skeletons = container.querySelectorAll('[aria-hidden="true"]');
      expect(skeletons.length).toBeGreaterThan(0);
      skeletons.forEach((skeleton) => {
        expect(skeleton).toHaveAttribute("aria-hidden", "true");
      });
    });
  });
});
