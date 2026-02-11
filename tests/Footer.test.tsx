import { render, screen } from "@testing-library/react";
import Footer from "../src/components/Footer";

describe("Footer", () => {
  it("renders branding text", () => {
    render(<Footer />);
    expect(screen.getByText("Allyourbase")).toBeInTheDocument();
  });

  it("renders heart emoji with accessible label", () => {
    render(<Footer />);
    expect(screen.getByLabelText("black heart")).toBeInTheDocument();
  });

  it("links to allyourbase.io", () => {
    render(<Footer />);
    const link = screen.getByText("Allyourbase");
    expect(link).toHaveAttribute("href", "https://allyourbase.io");
  });

  it("opens link in new tab", () => {
    render(<Footer />);
    const link = screen.getByText("Allyourbase");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders within a footer element", () => {
    const { container } = render(<Footer />);
    expect(container.querySelector("footer")).toBeInTheDocument();
  });
});
