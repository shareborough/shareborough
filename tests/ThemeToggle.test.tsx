import { render, screen, fireEvent, act } from "@testing-library/react";
import { ThemeProvider } from "../src/contexts/ThemeContext";
import ThemeToggle from "../src/components/ThemeToggle";

function renderToggle(className?: string) {
  return render(
    <ThemeProvider>
      <ThemeToggle className={className} />
    </ThemeProvider>,
  );
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("renders a button element", () => {
    renderToggle();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("defaults to system mode with 'Switch to light mode' label", () => {
    renderToggle();
    expect(screen.getByLabelText("Switch to light mode")).toBeInTheDocument();
  });

  it("shows 'Switch to dark mode' when in light mode", () => {
    localStorage.setItem("theme", "light");
    renderToggle();
    expect(screen.getByLabelText("Switch to dark mode")).toBeInTheDocument();
  });

  it("shows 'Switch to system theme' when in dark mode", () => {
    localStorage.setItem("theme", "dark");
    renderToggle();
    expect(screen.getByLabelText("Switch to system theme")).toBeInTheDocument();
  });

  it("shows sun icon in light mode", () => {
    localStorage.setItem("theme", "light");
    renderToggle();
    const svg = screen.getByRole("button").querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("text-amber-500");
  });

  it("shows moon icon in dark mode", () => {
    localStorage.setItem("theme", "dark");
    renderToggle();
    const svg = screen.getByRole("button").querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("text-blue-400");
  });

  it("shows monitor icon in system mode", () => {
    renderToggle();
    const svg = screen.getByRole("button").querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("text-gray-500");
  });

  it("cycles through modes on click: system → light → dark → system", () => {
    renderToggle();

    // system → light
    act(() => {
      fireEvent.click(screen.getByRole("button"));
    });
    expect(screen.getByLabelText("Switch to dark mode")).toBeInTheDocument();

    // light → dark
    act(() => {
      fireEvent.click(screen.getByRole("button"));
    });
    expect(screen.getByLabelText("Switch to system theme")).toBeInTheDocument();

    // dark → system
    act(() => {
      fireEvent.click(screen.getByRole("button"));
    });
    expect(screen.getByLabelText("Switch to light mode")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    renderToggle("my-custom-class");
    const button = screen.getByRole("button");
    expect(button.className).toContain("my-custom-class");
  });

  it("has title attribute matching aria-label", () => {
    localStorage.setItem("theme", "light");
    renderToggle();
    const button = screen.getByRole("button");
    expect(button.title).toBe("Switch to dark mode");
  });

  it("adds dark class to documentElement when switched to dark", () => {
    localStorage.setItem("theme", "light");
    renderToggle();

    act(() => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes dark class from documentElement when switched to light", () => {
    localStorage.setItem("theme", "dark");
    document.documentElement.classList.add("dark");
    renderToggle();

    // dark → system (resolved to light since matchMedia returns false)
    act(() => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
