import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import NotFound from "../src/pages/NotFound";

function renderNotFound() {
  return render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <NotFound />
    </BrowserRouter>,
  );
}

describe("NotFound", () => {
  it("renders 404 text", () => {
    renderNotFound();
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("renders page not found heading", () => {
    renderNotFound();
    expect(screen.getByText("Page not found")).toBeInTheDocument();
  });

  it("renders helpful description", () => {
    renderNotFound();
    expect(
      screen.getByText("The page you're looking for doesn't exist or has been moved."),
    ).toBeInTheDocument();
  });

  it("renders Go Home link pointing to /", () => {
    renderNotFound();
    const link = screen.getByText("Go Home");
    expect(link).toHaveAttribute("href", "/");
  });

  it("renders footer", () => {
    renderNotFound();
    expect(screen.getByText("Allyourbase")).toBeInTheDocument();
  });
});
