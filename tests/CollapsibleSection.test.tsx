import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import CollapsibleSection from "../src/components/CollapsibleSection";

function renderSection(props: Partial<React.ComponentProps<typeof CollapsibleSection>> = {}) {
  const defaultItems = Array.from({ length: 10 }, (_, i) => (
    <div key={i} data-testid={`item-${i}`}>Item {i}</div>
  ));
  return render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CollapsibleSection
        title="Test Section"
        count={10}
        maxItems={3}
        totalItems={10}
        {...props}
      >
        {props.children ?? defaultItems}
      </CollapsibleSection>
    </BrowserRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("CollapsibleSection", () => {
  it("renders title and count badge", () => {
    renderSection();
    expect(screen.getByText("Test Section")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("shows only maxItems children", () => {
    renderSection();
    expect(screen.getByTestId("item-0")).toBeInTheDocument();
    expect(screen.getByTestId("item-2")).toBeInTheDocument();
    expect(screen.queryByTestId("item-3")).not.toBeInTheDocument();
  });

  it("shows View all link when totalItems > maxItems and viewAllLink provided", () => {
    renderSection({ viewAllLink: "/dashboard/notifications" });
    const link = screen.getByText(/View all 10/);
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/dashboard/notifications");
  });

  it("shows Show all button when totalItems > maxItems and no viewAllLink", () => {
    renderSection();
    expect(screen.getByText(/Show all 10/)).toBeInTheDocument();
  });

  it("expands when Show all is clicked", () => {
    renderSection();
    fireEvent.click(screen.getByText(/Show all 10/));
    expect(screen.getByTestId("item-9")).toBeInTheDocument();
  });

  it("returns null when totalItems is 0", () => {
    const { container } = renderSection({ totalItems: 0, count: 0, children: [] });
    expect(container.innerHTML).toBe("");
  });

  it("collapses and expands on chevron click", () => {
    renderSection();
    const button = screen.getByRole("button", { name: /Collapse Test Section/ });
    fireEvent.click(button);
    expect(screen.queryByTestId("item-0")).not.toBeInTheDocument();

    const expandButton = screen.getByRole("button", { name: /Expand Test Section/ });
    fireEvent.click(expandButton);
    expect(screen.getByTestId("item-0")).toBeInTheDocument();
  });

  it("persists collapse state to localStorage", () => {
    renderSection({ persistKey: "test-section" });
    const button = screen.getByRole("button", { name: /Collapse Test Section/ });
    fireEvent.click(button);
    expect(localStorage.getItem("section-collapsed-test-section")).toBe("true");
  });

  it("restores collapse state from localStorage", () => {
    localStorage.setItem("section-collapsed-test-section", "true");
    renderSection({ persistKey: "test-section" });
    expect(screen.queryByTestId("item-0")).not.toBeInTheDocument();
  });

  it("does not show truncation when all items fit", () => {
    renderSection({ maxItems: 10 });
    expect(screen.queryByText(/Show all/)).not.toBeInTheDocument();
    expect(screen.queryByText(/View all/)).not.toBeInTheDocument();
  });
});
