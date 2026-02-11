import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Landing from "../src/pages/Landing";

function renderLanding(authed = false) {
  return render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Landing authed={authed} />
    </BrowserRouter>,
  );
}

describe("Landing", () => {
  it("renders hero heading", () => {
    renderLanding();
    expect(screen.getByText(/Lend stuff to/)).toBeInTheDocument();
    expect(screen.getByText(/your friends/)).toBeInTheDocument();
  });

  it("shows sign in and get started when not authed", () => {
    renderLanding(false);
    expect(screen.getByText("Sign in")).toBeInTheDocument();
    expect(screen.getByText("Get Started")).toBeInTheDocument();
  });

  it("shows dashboard link when authed", () => {
    renderLanding(true);
    expect(screen.getByText("My Libraries")).toBeInTheDocument();
    expect(screen.queryByText("Sign in")).not.toBeInTheDocument();
  });

  it("renders three feature cards", () => {
    renderLanding();
    expect(screen.getByText("Snap & Catalog")).toBeInTheDocument();
    expect(screen.getByText("Share a Link")).toBeInTheDocument();
    expect(screen.getByText("SMS Reminders")).toBeInTheDocument();
  });

  it("renders footer", () => {
    renderLanding();
    expect(screen.getByText(/Allyourbase/)).toBeInTheDocument();
  });
});
