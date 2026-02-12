import { render, screen, fireEvent, act } from "@testing-library/react";
import { ThemeProvider, ThemeContext } from "../src/contexts/ThemeContext";
import { useTheme } from "../src/hooks/useTheme";
import { useContext } from "react";

// Helper component to expose context values for testing
function ThemeConsumer() {
  const ctx = useContext(ThemeContext)!;
  return (
    <div>
      <span data-testid="mode">{ctx.mode}</span>
      <span data-testid="resolved">{ctx.resolved}</span>
      <button onClick={ctx.toggle}>toggle</button>
      <button onClick={() => ctx.setMode("light")}>set-light</button>
      <button onClick={() => ctx.setMode("dark")}>set-dark</button>
      <button onClick={() => ctx.setMode("system")}>set-system</button>
    </div>
  );
}

function renderTheme() {
  return render(
    <ThemeProvider>
      <ThemeConsumer />
    </ThemeProvider>,
  );
}

describe("ThemeContext", () => {
  let matchMediaListeners: Array<(e: { matches: boolean }) => void>;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    matchMediaListeners = [];

    // Mock matchMedia — default to light system preference
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false, // light system preference
        media: query,
        onchange: null,
        addEventListener: (_event: string, handler: (e: { matches: boolean }) => void) => {
          matchMediaListeners.push(handler);
        },
        removeEventListener: (_event: string, handler: (e: { matches: boolean }) => void) => {
          matchMediaListeners = matchMediaListeners.filter((h) => h !== handler);
        },
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to system mode when no localStorage value", () => {
    renderTheme();
    expect(screen.getByTestId("mode")).toHaveTextContent("system");
  });

  it("resolves to light when system preference is light and mode is system", () => {
    renderTheme();
    expect(screen.getByTestId("resolved")).toHaveTextContent("light");
  });

  it("resolves to dark when system preference is dark and mode is system", () => {
    // Override matchMedia to return dark
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: true, // dark system preference
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    renderTheme();
    expect(screen.getByTestId("mode")).toHaveTextContent("system");
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
  });

  it("reads mode from localStorage on mount and applies dark class", () => {
    localStorage.setItem("theme", "dark");
    renderTheme();
    expect(screen.getByTestId("mode")).toHaveTextContent("dark");
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("ignores invalid localStorage values and defaults to system", () => {
    localStorage.setItem("theme", "invalid-value");
    renderTheme();
    expect(screen.getByTestId("mode")).toHaveTextContent("system");
  });

  it("setMode('dark') updates mode, resolved, and localStorage", () => {
    renderTheme();
    act(() => {
      fireEvent.click(screen.getByText("set-dark"));
    });
    expect(screen.getByTestId("mode")).toHaveTextContent("dark");
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("setMode('light') updates mode, resolved, and localStorage", () => {
    localStorage.setItem("theme", "dark");
    renderTheme();
    act(() => {
      fireEvent.click(screen.getByText("set-light"));
    });
    expect(screen.getByTestId("mode")).toHaveTextContent("light");
    expect(screen.getByTestId("resolved")).toHaveTextContent("light");
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("toggle cycles light → dark → system → light", () => {
    localStorage.setItem("theme", "light");
    renderTheme();

    expect(screen.getByTestId("mode")).toHaveTextContent("light");

    // light → dark
    act(() => {
      fireEvent.click(screen.getByText("toggle"));
    });
    expect(screen.getByTestId("mode")).toHaveTextContent("dark");

    // dark → system
    act(() => {
      fireEvent.click(screen.getByText("toggle"));
    });
    expect(screen.getByTestId("mode")).toHaveTextContent("system");

    // system → light
    act(() => {
      fireEvent.click(screen.getByText("toggle"));
    });
    expect(screen.getByTestId("mode")).toHaveTextContent("light");
  });

  it("applies 'dark' class to document.documentElement when resolved is dark", () => {
    renderTheme();
    act(() => {
      fireEvent.click(screen.getByText("set-dark"));
    });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes 'dark' class from document.documentElement when resolved is light", () => {
    document.documentElement.classList.add("dark");
    renderTheme();
    act(() => {
      fireEvent.click(screen.getByText("set-light"));
    });
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("updates meta theme-color when theme changes", () => {
    // Create a theme-color meta tag
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = "#4a7c59";
    document.head.appendChild(meta);

    renderTheme();
    act(() => {
      fireEvent.click(screen.getByText("set-dark"));
    });
    expect(meta.content).toBe("#111827");

    act(() => {
      fireEvent.click(screen.getByText("set-light"));
    });
    expect(meta.content).toBe("#4a7c59");

    document.head.removeChild(meta);
  });

  it("responds to system preference changes when mode is system", () => {
    renderTheme();
    expect(screen.getByTestId("mode")).toHaveTextContent("system");
    expect(screen.getByTestId("resolved")).toHaveTextContent("light");

    // Simulate system preference changing to dark
    // We need to update the matchMedia mock AND fire the listener
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    act(() => {
      matchMediaListeners.forEach((listener) => listener({ matches: true }));
    });

    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
  });

  it("does NOT respond to system preference changes when mode is explicit", () => {
    localStorage.setItem("theme", "light");
    renderTheme();

    expect(screen.getByTestId("resolved")).toHaveTextContent("light");

    // Simulate system preference changing to dark
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    act(() => {
      matchMediaListeners.forEach((listener) => listener({ matches: true }));
    });

    // Should still be light because mode is explicitly "light", not "system"
    expect(screen.getByTestId("resolved")).toHaveTextContent("light");
  });

  it("persists mode across re-renders", () => {
    const { unmount } = renderTheme();

    act(() => {
      fireEvent.click(screen.getByText("set-dark"));
    });
    expect(localStorage.getItem("theme")).toBe("dark");

    unmount();

    // Re-render — should pick up from localStorage
    renderTheme();
    expect(screen.getByTestId("mode")).toHaveTextContent("dark");
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
  });
});

describe("useTheme without provider", () => {
  it("throws error when used outside ThemeProvider", () => {
    // Suppress React error boundary console output
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    function Broken() {
      useTheme();
      return null;
    }

    expect(() => render(<Broken />)).toThrow("useTheme must be used within ThemeProvider");

    consoleSpy.mockRestore();
  });
});
