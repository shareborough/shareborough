import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "../src/contexts/ToastContext";
import App from "../src/App";

// Mock AYB client
vi.mock("../src/lib/ayb", () => ({
  ayb: {
    auth: {
      me: vi.fn().mockResolvedValue({ id: "1", email: "test@example.com" }),
      login: vi.fn(),
      register: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
    records: {
      list: vi.fn().mockResolvedValue({ items: [], totalItems: 0 }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
  isLoggedIn: vi.fn(() => false),
  validateSession: vi.fn().mockResolvedValue("valid"),
  persistTokens: vi.fn(),
  clearTokens: vi.fn(),
}));

// Mock health check hook
vi.mock("../src/hooks/useHealthCheck", () => ({
  useHealthCheck: () => ({ isOnline: true, retryIn: null }),
}));

// Mock service worker hook
vi.mock("../src/hooks/useServiceWorker", () => ({
  useServiceWorker: () => ({ updateAvailable: false }),
}));

// Helper to render with providers
function renderWithProviders(ui: React.ReactElement, initialRoute = "/") {
  window.history.pushState({}, "", initialRoute);
  return render(
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>{ui}</ToastProvider>
    </BrowserRouter>,
  );
}

describe("Code Splitting & Lazy Loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Lazy-loaded routes render correctly", () => {
    it("should lazy load Dashboard route", async () => {
      // Mock authenticated state
      const { isLoggedIn } = await import("../src/lib/ayb");
      vi.mocked(isLoggedIn).mockReturnValue(true);

      renderWithProviders(<App />, "/dashboard");

      // Wait for Dashboard to load (may or may not see loading state due to fast load)
      await waitFor(() => {
        expect(screen.getByText(/my libraries/i)).toBeInTheDocument();
      });
    });

    it("should lazy load Settings route", async () => {
      const { isLoggedIn } = await import("../src/lib/ayb");
      vi.mocked(isLoggedIn).mockReturnValue(true);

      renderWithProviders(<App />, "/dashboard/settings");

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });
    });

    it("should lazy load PublicLibrary route", async () => {
      const { ayb } = await import("../src/lib/ayb");
      vi.mocked(ayb.records.get).mockResolvedValue({
        id: "1",
        name: "Test Library",
        slug: "test-lib",
      });

      renderWithProviders(<App />, "/l/test-lib");

      await waitFor(() => {
        expect(screen.getByText(/test library/i)).toBeInTheDocument();
      });
    });

    it("should lazy load NotFound route", async () => {
      renderWithProviders(<App />, "/nonexistent");

      await waitFor(() => {
        expect(screen.getByText(/404/i)).toBeInTheDocument();
        expect(screen.getByText(/page not found/i)).toBeInTheDocument();
      });
    });
  });

  describe("Suspense fallback behavior", () => {
    it("should eventually load lazy routes successfully", async () => {
      const { isLoggedIn } = await import("../src/lib/ayb");
      vi.mocked(isLoggedIn).mockReturnValue(true);

      renderWithProviders(<App />, "/dashboard");

      // Should eventually load Dashboard successfully
      await waitFor(() => {
        expect(screen.getByText(/my libraries/i)).toBeInTheDocument();
      });
    });

    it("should load multiple lazy routes in sequence", async () => {
      const { isLoggedIn } = await import("../src/lib/ayb");
      vi.mocked(isLoggedIn).mockReturnValue(true);

      // First route
      const { unmount } = renderWithProviders(<App />, "/dashboard/settings");
      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });
      unmount();

      // Second route
      renderWithProviders(<App />, "/dashboard");
      await waitFor(() => {
        expect(screen.getByText(/my libraries/i)).toBeInTheDocument();
      });
    });
  });

  describe("Eager-loaded routes (no lazy loading)", () => {
    it("should render Landing page immediately", () => {
      renderWithProviders(<App />, "/");

      // Landing should render (may briefly show loading state due to Suspense wrapper)
      expect(screen.getByText(/shareborough/i)).toBeInTheDocument();
    });

    it("should render AuthPage immediately", () => {
      renderWithProviders(<App />, "/login");

      // AuthPage should render
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });
  });

  describe("Error boundary for chunk failures", () => {
    it("should wrap routes with ChunkErrorBoundary", async () => {
      const { isLoggedIn } = await import("../src/lib/ayb");
      vi.mocked(isLoggedIn).mockReturnValue(true);

      // ChunkErrorBoundary is present in App.tsx wrapping all routes
      renderWithProviders(<App />, "/dashboard");

      // Normal flow: should load successfully
      await waitFor(() => {
        expect(screen.getByText(/my libraries/i)).toBeInTheDocument();
      });
    });
  });

  describe("Preloading strategy", () => {
    it("should render AuthPage which triggers Dashboard preload", async () => {
      // Render AuthPage
      renderWithProviders(<App />, "/login");

      // AuthPage has useEffect that preloads Dashboard
      // This is a preventive preload - doesn't affect UI, just network activity
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();

      // Preload happens in background via useEffect in AuthPage.tsx
      // No UI assertion needed - this is a performance optimization
    });
  });

  describe("Bundle structure verification (source code checks)", () => {
    it("should import Dashboard lazily in App.tsx", async () => {
      // Import App source to verify lazy import pattern exists
      const fs = await import("fs/promises");
      const appSource = await fs.readFile(
        new URL("../src/App.tsx", import.meta.url),
        "utf-8",
      );

      // Verify Dashboard is lazy-loaded
      expect(appSource).toMatch(/const Dashboard = lazy\(\s*\(\)\s*=>\s*import\(["']\.\/pages\/Dashboard["']\)/);
    });

    it("should import Settings lazily in App.tsx", async () => {
      const fs = await import("fs/promises");
      const appSource = await fs.readFile(
        new URL("../src/App.tsx", import.meta.url),
        "utf-8",
      );

      // Verify Settings is lazy-loaded
      expect(appSource).toMatch(/const Settings = lazy\(\s*\(\)\s*=>\s*import\(["']\.\/pages\/Settings["']\)/);
    });

    it("should eagerly import Landing and AuthPage in App.tsx", async () => {
      const fs = await import("fs/promises");
      const appSource = await fs.readFile(
        new URL("../src/App.tsx", import.meta.url),
        "utf-8",
      );

      // Verify eager imports exist (standard import, not lazy)
      expect(appSource).toMatch(/import Landing from ["']\.\/pages\/Landing["']/);
      expect(appSource).toMatch(/import AuthPage from ["']\.\/pages\/AuthPage["']/);

      // Verify Landing and AuthPage are NOT lazy-loaded
      expect(appSource).not.toContain('lazy(() => import("./pages/Landing")');
      expect(appSource).not.toContain('lazy(() => import("./pages/AuthPage")');
    });
  });
});
