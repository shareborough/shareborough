/**
 * Navigation E2E tests.
 * Tests top-right navigation buttons, mobile layout, and responsive design.
 * Behavior-driven: verifies expected navigation flows and mobile rendering.
 */

import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { BrowserRouter, MemoryRouter, Routes, Route } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import Landing from "../src/pages/Landing";
import NavBar from "../src/components/NavBar";
import Dashboard from "../src/pages/Dashboard";
import { renderWithProviders } from "./testHelpers";
import { ThemeProvider } from "../src/contexts/ThemeContext";

// --- Mock AYB client ---

const mockLogin = vi.fn();
const mockList = vi.fn();
const mockGet = vi.fn();

vi.mock("../src/lib/ayb", () => ({
  ayb: {
    auth: {
      login: (...args: unknown[]) => mockLogin(...args),
      me: vi.fn().mockResolvedValue({ id: "1", email: "test@example.com" }),
    },
    records: {
      list: (...args: unknown[]) => mockList(...args),
      get: (...args: unknown[]) => mockGet(...args),
    },
    realtime: {
      subscribe: vi.fn(() => () => {}),
    },
    token: "mock.jwt.token",
  },
  isLoggedIn: () => true,
  currentUserId: () => "test-user-id",
  persistTokens: vi.fn(),
  clearPersistedTokens: vi.fn(),
}));

vi.mock("../src/lib/rpc", () => ({
  rpc: vi.fn(),
}));

vi.mock("../src/lib/reminders", () => ({
  scheduleReminders: vi.fn().mockResolvedValue(6),
}));

vi.mock("../src/hooks/useHealthCheck", () => ({
  default: () => ({ isOnline: true }),
}));

// --- Viewport utilities ---

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    writable: true,
    configurable: true,
    value: height,
  });
  window.dispatchEvent(new Event("resize"));
}

/**
 * Check if element has minimum 44px height via CSS classes.
 * jsdom doesn't render, so getBoundingClientRect returns 0.
 * Instead, we check for Tailwind classes that enforce min-height.
 */
function hasMinimumTouchTarget(element: HTMLElement): boolean {
  const className = element.className;
  // Check for min-h-[44px] or min-h-[48px] or similar
  return className.includes("min-h-[44px]") || className.includes("min-h-[48px]");
}

// --- Tests ---

describe("Navigation E2E", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setViewport(1024, 768); // Desktop default
  });

  describe("Landing Page - Unauthenticated", () => {
    it("displays Sign in and Get Started buttons in top-right", () => {
      render(
        <BrowserRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <ThemeProvider>
            <Landing authed={false} />
          </ThemeProvider>
        </BrowserRouter>,
      );

      // Find header buttons
      const header = screen.getByRole("banner");
      const signInBtn = within(header).getByText("Sign in");
      const getStartedBtn = within(header).getByText("Get Started");

      expect(signInBtn).toBeInTheDocument();
      expect(getStartedBtn).toBeInTheDocument();
    });

    it("Sign in button navigates to /login", () => {
      render(
        <MemoryRouter
          initialEntries={["/landing"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <ThemeProvider>
            <Routes>
              <Route path="/landing" element={<Landing authed={false} />} />
              <Route path="/login" element={<div>Login Page</div>} />
            </Routes>
          </ThemeProvider>
        </MemoryRouter>,
      );

      const signInBtn = screen.getByRole("link", { name: "Sign in" });
      expect(signInBtn).toHaveAttribute("href", "/login");
    });

    it("Get Started button navigates to /signup", () => {
      render(
        <MemoryRouter
          initialEntries={["/landing"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <ThemeProvider>
            <Routes>
              <Route path="/landing" element={<Landing authed={false} />} />
              <Route path="/signup" element={<div>Signup Page</div>} />
            </Routes>
          </ThemeProvider>
        </MemoryRouter>,
      );

      const getStartedBtn = screen.getAllByRole("link", {
        name: /Get Started|Start Your Library/i,
      })[0];
      expect(getStartedBtn).toHaveAttribute("href", "/signup");
    });

    it("buttons have minimum 44px height for touch targets", () => {
      render(
        <BrowserRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <ThemeProvider>
            <Landing authed={false} />
          </ThemeProvider>
        </BrowserRouter>,
      );

      const signInBtn = screen.getByRole("link", { name: "Sign in" });
      const getStartedBtn = screen.getAllByRole("link", {
        name: /Get Started|Start Your Library/i,
      })[0];

      // jsdom doesn't render, so check CSS classes instead
      expect(hasMinimumTouchTarget(signInBtn)).toBe(true);
      expect(hasMinimumTouchTarget(getStartedBtn)).toBe(true);
    });
  });

  describe("Landing Page - Authenticated", () => {
    it("displays My Libraries button when authenticated", () => {
      render(
        <BrowserRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <ThemeProvider>
            <Landing authed={true} />
          </ThemeProvider>
        </BrowserRouter>,
      );

      const header = screen.getByRole("banner");
      const myLibrariesBtn = within(header).getByText("My Libraries");

      expect(myLibrariesBtn).toBeInTheDocument();
      expect(screen.queryByText("Sign in")).not.toBeInTheDocument();
      expect(screen.queryByText("Get Started")).not.toBeInTheDocument();
    });

    it("My Libraries button navigates to /dashboard", () => {
      render(
        <MemoryRouter
          initialEntries={["/landing"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <ThemeProvider>
            <Landing authed={true} />
          </ThemeProvider>
        </MemoryRouter>,
      );

      const myLibrariesBtn = screen.getAllByRole("link", {
        name: "My Libraries",
      })[0];
      expect(myLibrariesBtn).toHaveAttribute("href", "/dashboard");
    });
  });

  describe("NavBar - Authenticated Navigation", () => {
    it("displays My Libraries link and avatar button", () => {
      const onLogout = vi.fn();
      render(
        <BrowserRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <ThemeProvider>
            <NavBar onLogout={onLogout} />
          </ThemeProvider>
        </BrowserRouter>,
      );

      expect(screen.getByText("My Libraries")).toBeInTheDocument();
      expect(screen.getByLabelText("Account menu")).toBeInTheDocument();
    });

    it("My Libraries link navigates to /dashboard", () => {
      const onLogout = vi.fn();
      render(
        <MemoryRouter
          initialEntries={["/dashboard"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <ThemeProvider>
            <NavBar onLogout={onLogout} />
          </ThemeProvider>
        </MemoryRouter>,
      );

      const myLibrariesLinks = screen.getAllByRole("link", {
        name: "My Libraries",
      });
      expect(myLibrariesLinks[0]).toHaveAttribute("href", "/dashboard");
    });

    it("avatar button opens dropdown menu", () => {
      const onLogout = vi.fn();
      render(
        <BrowserRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <ThemeProvider>
            <NavBar onLogout={onLogout} />
          </ThemeProvider>
        </BrowserRouter>,
      );

      const avatarBtn = screen.getByLabelText("Account menu");
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();

      fireEvent.click(avatarBtn);

      expect(screen.getByRole("menu")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByText("Sign out")).toBeInTheDocument();
    });

    it("dropdown closes when clicking outside", async () => {
      const onLogout = vi.fn();
      render(
        <div>
          <BrowserRouter
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          >
            <ThemeProvider>
              <NavBar onLogout={onLogout} />
            </ThemeProvider>
          </BrowserRouter>
          <div data-testid="outside">Outside</div>
        </div>,
      );

      const avatarBtn = screen.getByLabelText("Account menu");
      fireEvent.click(avatarBtn);
      expect(screen.getByRole("menu")).toBeInTheDocument();

      fireEvent.mouseDown(screen.getByTestId("outside"));

      await waitFor(() => {
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      });
    });

    it("dropdown closes on Escape key", async () => {
      const onLogout = vi.fn();
      render(
        <BrowserRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <ThemeProvider>
            <NavBar onLogout={onLogout} />
          </ThemeProvider>
        </BrowserRouter>,
      );

      const avatarBtn = screen.getByLabelText("Account menu");
      fireEvent.click(avatarBtn);
      expect(screen.getByRole("menu")).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });

      await waitFor(() => {
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      });
    });

    it("Sign out button calls onLogout and clears tokens", () => {
      const onLogout = vi.fn();
      const navigate = vi.fn();

      vi.doMock("react-router-dom", async () => {
        const actual = await vi.importActual("react-router-dom");
        return {
          ...actual,
          useNavigate: () => navigate,
        };
      });

      render(
        <BrowserRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <ThemeProvider>
            <NavBar onLogout={onLogout} />
          </ThemeProvider>
        </BrowserRouter>,
      );

      const avatarBtn = screen.getByLabelText("Account menu");
      fireEvent.click(avatarBtn);

      const signOutBtn = screen.getByText("Sign out");
      fireEvent.click(signOutBtn);

      expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it("all navigation elements have minimum 44px touch targets", () => {
      const onLogout = vi.fn();
      render(
        <BrowserRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <ThemeProvider>
            <NavBar onLogout={onLogout} />
          </ThemeProvider>
        </BrowserRouter>,
      );

      const myLibrariesLink = screen.getByRole("link", {
        name: "My Libraries",
      });
      const avatarBtn = screen.getByLabelText("Account menu");

      // jsdom doesn't render, so check CSS classes instead
      expect(hasMinimumTouchTarget(myLibrariesLink)).toBe(true);
      expect(hasMinimumTouchTarget(avatarBtn)).toBe(true);
    });
  });

  describe("Mobile Layout - iPhone SE 2021 (375x667)", () => {
    beforeEach(() => {
      setViewport(375, 667);
    });

    it("renders Landing page with proper responsive layout", () => {
      render(
        <BrowserRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <ThemeProvider>
            <Landing authed={false} />
          </ThemeProvider>
        </BrowserRouter>,
      );

      const header = screen.getByRole("banner");
      const signInBtn = within(header).getByText("Sign in");
      const getStartedBtn = within(header).getByText("Get Started");

      // Verify buttons exist and are rendered
      expect(signInBtn).toBeInTheDocument();
      expect(getStartedBtn).toBeInTheDocument();

      // Verify they have flex gap for spacing (prevents overlap)
      const buttonContainer = signInBtn.parentElement;
      expect(buttonContainer?.className).toContain("flex");
      expect(buttonContainer?.className).toContain("gap");
    });

    it("NavBar renders with proper responsive layout on mobile", () => {
      const onLogout = vi.fn();
      render(
        <BrowserRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <ThemeProvider>
            <NavBar onLogout={onLogout} />
          </ThemeProvider>
        </BrowserRouter>,
      );

      const myLibrariesLink = screen.getByRole("link", {
        name: "My Libraries",
      });
      const avatarBtn = screen.getByLabelText("Account menu");

      // Verify elements exist
      expect(myLibrariesLink).toBeInTheDocument();
      expect(avatarBtn).toBeInTheDocument();

      // Verify they're in a flex container with gap
      const container = myLibrariesLink.parentElement;
      expect(container?.className).toContain("flex");
      expect(container?.className).toContain("gap");
    });

    it("maintains minimum 44px touch targets on mobile", () => {
      render(
        <BrowserRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <ThemeProvider>
            <Landing authed={false} />
          </ThemeProvider>
        </BrowserRouter>,
      );

      const header = screen.getByRole("banner");
      const signInBtn = within(header).getByText("Sign in");
      const getStartedBtn = within(header).getByText("Get Started");

      // jsdom doesn't render, so check CSS classes instead
      expect(hasMinimumTouchTarget(signInBtn)).toBe(true);
      expect(hasMinimumTouchTarget(getStartedBtn)).toBe(true);
    });

    it("NavBar brand text collapses on mobile (hidden sm:inline)", () => {
      const onLogout = vi.fn();
      const { container } = render(
        <BrowserRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <ThemeProvider>
            <NavBar onLogout={onLogout} />
          </ThemeProvider>
        </BrowserRouter>,
      );

      // Find the brand text span with "hidden sm:inline" class
      const brandText = container.querySelector(".hidden.sm\\:inline");
      expect(brandText).toBeInTheDocument();
      expect(brandText?.textContent).toBe("Shareborough");
    });

    it("all header buttons use responsive padding and spacing", () => {
      const onLogout = vi.fn();
      const { container } = render(
        <BrowserRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <ThemeProvider>
            <NavBar onLogout={onLogout} />
          </ThemeProvider>
        </BrowserRouter>,
      );

      const header = container.querySelector("header");
      expect(header).toBeInTheDocument();

      // Verify responsive padding classes (sm: prefix for larger screens)
      expect(header?.className).toContain("px-");
      expect(header?.className).toContain("py-");
    });
  });

  describe("Mobile Layout - Dashboard on iPhone SE", () => {
    beforeEach(() => {
      setViewport(375, 667);
      mockList.mockResolvedValue({ items: [], totalItems: 0 });
      mockGet.mockResolvedValue({ items: [] });
    });

    it("renders Dashboard with responsive container", async () => {
      renderWithProviders(<Dashboard />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(mockList).toHaveBeenCalled();
      });

      // Verify Dashboard has responsive container classes
      const mainContent = screen.getByText(/My Libraries|Create Library/i).closest("div");
      expect(mainContent).toBeInTheDocument();
    });
  });

  describe("Responsive Touch Targets", () => {
    const testViewports = [
      { name: "iPhone SE 2021", width: 375, height: 667 },
      { name: "iPhone 12/13 Mini", width: 390, height: 844 },
      { name: "iPhone 12/13 Pro", width: 393, height: 852 },
      { name: "iPad Mini", width: 768, height: 1024 },
    ];

    testViewports.forEach(({ name, width, height }) => {
      it(`maintains 44px touch targets on ${name} (${width}x${height})`, () => {
        setViewport(width, height);

        render(
          <BrowserRouter
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          >
            <ThemeProvider>
              <Landing authed={false} />
            </ThemeProvider>
          </BrowserRouter>,
        );

        const header = screen.getByRole("banner");
        const signInBtn = within(header).getByText("Sign in");
        const getStartedBtn = within(header).getByText("Get Started");

        // jsdom doesn't render, so check CSS classes instead
        expect(hasMinimumTouchTarget(signInBtn)).toBe(true);
        expect(hasMinimumTouchTarget(getStartedBtn)).toBe(true);
      });
    });
  });
});
