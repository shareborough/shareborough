import { render } from "@testing-library/react";
import Skeleton from "../src/components/Skeleton";

describe("Skeleton", () => {
  it("renders a single shimmer element", () => {
    const { container } = render(<Skeleton />);
    const el = container.querySelector(".skeleton-shimmer");
    expect(el).toBeInTheDocument();
  });

  it("applies default width and height classes", () => {
    const { container } = render(<Skeleton />);
    const el = container.querySelector(".skeleton-shimmer")!;
    expect(el.className).toContain("h-4");
    expect(el.className).toContain("w-full");
  });

  it("applies custom className", () => {
    const { container } = render(<Skeleton className="h-8 w-32" />);
    const el = container.querySelector(".skeleton-shimmer")!;
    expect(el.className).toContain("h-8");
    expect(el.className).toContain("w-32");
  });

  it("uses rounded-full when round prop is set", () => {
    const { container } = render(<Skeleton round />);
    const el = container.querySelector(".skeleton-shimmer")!;
    expect(el.className).toContain("rounded-full");
  });

  it("uses rounded (not rounded-full) by default", () => {
    const { container } = render(<Skeleton />);
    const el = container.querySelector(".skeleton-shimmer")!;
    expect(el.className).toContain("rounded");
    expect(el.className).not.toContain("rounded-full");
  });

  it("is hidden from screen readers via aria-hidden", () => {
    const { container } = render(<Skeleton />);
    const el = container.querySelector(".skeleton-shimmer")!;
    expect(el).toHaveAttribute("aria-hidden", "true");
  });
});

describe("Skeleton.Text", () => {
  it("renders default 3 lines", () => {
    const { container } = render(<Skeleton.Text />);
    const shimmerEls = container.querySelectorAll(".skeleton-shimmer");
    expect(shimmerEls).toHaveLength(3);
  });

  it("renders custom number of lines", () => {
    const { container } = render(<Skeleton.Text lines={5} />);
    const shimmerEls = container.querySelectorAll(".skeleton-shimmer");
    expect(shimmerEls).toHaveLength(5);
  });

  it("makes the last line shorter (w-2/3)", () => {
    const { container } = render(<Skeleton.Text lines={3} />);
    const shimmerEls = container.querySelectorAll(".skeleton-shimmer");
    const lastLine = shimmerEls[shimmerEls.length - 1];
    expect(lastLine.className).toContain("w-2/3");
  });

  it("makes non-last lines full width", () => {
    const { container } = render(<Skeleton.Text lines={3} />);
    const shimmerEls = container.querySelectorAll(".skeleton-shimmer");
    expect(shimmerEls[0].className).toContain("w-full");
    expect(shimmerEls[1].className).toContain("w-full");
  });

  it("is hidden from screen readers via aria-hidden", () => {
    const { container } = render(<Skeleton.Text />);
    const wrapper = container.firstElementChild!;
    expect(wrapper).toHaveAttribute("aria-hidden", "true");
  });
});

describe("Skeleton.Card", () => {
  it("renders a card-shaped skeleton with shimmer elements", () => {
    const { container } = render(<Skeleton.Card />);
    const shimmerEls = container.querySelectorAll(".skeleton-shimmer");
    expect(shimmerEls.length).toBeGreaterThanOrEqual(3);
  });

  it("has card styling", () => {
    const { container } = render(<Skeleton.Card />);
    const wrapper = container.firstElementChild!;
    expect(wrapper.className).toContain("card");
  });

  it("is hidden from screen readers", () => {
    const { container } = render(<Skeleton.Card />);
    const wrapper = container.firstElementChild!;
    expect(wrapper).toHaveAttribute("aria-hidden", "true");
  });

  it("accepts custom className", () => {
    const { container } = render(<Skeleton.Card className="mt-4" />);
    const wrapper = container.firstElementChild!;
    expect(wrapper.className).toContain("mt-4");
  });
});
