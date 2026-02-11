import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "../src/contexts/ToastContext";

// Control the auth state from tests
const mockIsLoggedIn = vi.hoisted(() => vi.fn(() => false));
const mockValidateSession = vi.hoisted(() => vi.fn(() => Promise.resolve("valid" as const)));

vi.mock("../src/lib/ayb", () => ({
  isLoggedIn: mockIsLoggedIn,
  validateSession: mockValidateSession,
  ayb: { token: null },
  clearPersistedTokens: vi.fn(),
}));

// Stub all child pages to simple text markers so we can detect which rendered
vi.mock("../src/pages/Landing", () => ({
  default: ({ authed }: { authed: boolean }) => (
    <div data-testid="landing">{authed ? "Landing (authed)" : "Landing"}</div>
  ),
}));
vi.mock("../src/pages/AuthPage", () => ({
  default: ({ mode }: { mode: string }) => <div data-testid="auth-page">AuthPage:{mode}</div>,
}));
vi.mock("../src/pages/Dashboard", () => ({
  default: () => <div data-testid="dashboard">Dashboard</div>,
}));
vi.mock("../src/pages/LibraryDetail", () => ({
  default: () => <div data-testid="library-detail">LibraryDetail</div>,
}));
vi.mock("../src/pages/AddItem", () => ({
  default: () => <div data-testid="add-item">AddItem</div>,
}));
vi.mock("../src/pages/Settings", () => ({
  default: () => <div data-testid="settings">Settings</div>,
}));
vi.mock("../src/pages/PublicLibrary", () => ({
  default: () => <div data-testid="public-library">PublicLibrary</div>,
}));
vi.mock("../src/pages/PublicItem", () => ({
  default: () => <div data-testid="public-item">PublicItem</div>,
}));
vi.mock("../src/pages/BorrowConfirmation", () => ({
  default: () => <div data-testid="borrow-confirmation">BorrowConfirmation</div>,
}));
vi.mock("../src/pages/NotFound", () => ({
  default: () => <div data-testid="not-found">NotFound</div>,
}));
vi.mock("../src/components/NavBar", () => ({
  default: () => <div data-testid="navbar">NavBar</div>,
}));
vi.mock("../src/components/OfflineBanner", () => ({
  default: () => null,
}));

import App from "../src/App";

function renderApp(initialRoute: string) {
  return render(
    <MemoryRouter initialEntries={[initialRoute]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("Auth Guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateSession.mockResolvedValue("valid");
  });

  describe("when NOT authenticated", () => {
    beforeEach(() => {
      mockIsLoggedIn.mockReturnValue(false);
    });

    it("/dashboard redirects to /login", async () => {
      await act(async () => renderApp("/dashboard"));
      expect(screen.getByTestId("auth-page")).toHaveTextContent("AuthPage:login");
      expect(screen.queryByTestId("dashboard")).not.toBeInTheDocument();
    });

    it("/dashboard/library/:id redirects to /login", async () => {
      await act(async () => renderApp("/dashboard/library/abc123"));
      expect(screen.getByTestId("auth-page")).toHaveTextContent("AuthPage:login");
      expect(screen.queryByTestId("library-detail")).not.toBeInTheDocument();
    });

    it("/dashboard/library/:id/add redirects to /login", async () => {
      await act(async () => renderApp("/dashboard/library/abc123/add"));
      expect(screen.getByTestId("auth-page")).toHaveTextContent("AuthPage:login");
      expect(screen.queryByTestId("add-item")).not.toBeInTheDocument();
    });

    it("/dashboard/settings redirects to /login", async () => {
      await act(async () => renderApp("/dashboard/settings"));
      expect(screen.getByTestId("auth-page")).toHaveTextContent("AuthPage:login");
      expect(screen.queryByTestId("settings")).not.toBeInTheDocument();
    });

    it("/login shows AuthPage login", async () => {
      await act(async () => renderApp("/login"));
      expect(screen.getByTestId("auth-page")).toHaveTextContent("AuthPage:login");
    });

    it("/signup shows AuthPage register", async () => {
      await act(async () => renderApp("/signup"));
      expect(screen.getByTestId("auth-page")).toHaveTextContent("AuthPage:register");
    });
  });

  describe("when authenticated", () => {
    beforeEach(() => {
      mockIsLoggedIn.mockReturnValue(true);
    });

    it("/dashboard renders Dashboard with NavBar", async () => {
      await act(async () => renderApp("/dashboard"));
      expect(screen.getByTestId("dashboard")).toBeInTheDocument();
      expect(screen.getByTestId("navbar")).toBeInTheDocument();
    });

    it("/dashboard/library/:id renders LibraryDetail with NavBar", async () => {
      await act(async () => renderApp("/dashboard/library/abc123"));
      expect(screen.getByTestId("library-detail")).toBeInTheDocument();
      expect(screen.getByTestId("navbar")).toBeInTheDocument();
    });

    it("/dashboard/library/:id/add renders AddItem with NavBar", async () => {
      await act(async () => renderApp("/dashboard/library/abc123/add"));
      expect(screen.getByTestId("add-item")).toBeInTheDocument();
      expect(screen.getByTestId("navbar")).toBeInTheDocument();
    });

    it("/dashboard/settings renders Settings with NavBar", async () => {
      await act(async () => renderApp("/dashboard/settings"));
      expect(screen.getByTestId("settings")).toBeInTheDocument();
      expect(screen.getByTestId("navbar")).toBeInTheDocument();
    });

    it("/login redirects to /dashboard", async () => {
      await act(async () => renderApp("/login"));
      expect(screen.getByTestId("dashboard")).toBeInTheDocument();
      expect(screen.queryByTestId("auth-page")).not.toBeInTheDocument();
    });

    it("/signup redirects to /dashboard", async () => {
      await act(async () => renderApp("/signup"));
      expect(screen.getByTestId("dashboard")).toBeInTheDocument();
      expect(screen.queryByTestId("auth-page")).not.toBeInTheDocument();
    });
  });

  describe("public routes (accessible regardless of auth)", () => {
    beforeEach(() => {
      mockIsLoggedIn.mockReturnValue(false);
    });

    it("/ renders Landing", async () => {
      await act(async () => renderApp("/"));
      expect(screen.getByTestId("landing")).toBeInTheDocument();
    });

    it("/l/:slug renders PublicLibrary", async () => {
      await act(async () => renderApp("/l/my-books"));
      expect(screen.getByTestId("public-library")).toBeInTheDocument();
    });

    it("/l/:slug/:itemId renders PublicItem", async () => {
      await act(async () => renderApp("/l/my-books/item-42"));
      expect(screen.getByTestId("public-item")).toBeInTheDocument();
    });

    it("/borrow/:requestId renders BorrowConfirmation", async () => {
      await act(async () => renderApp("/borrow/req-99"));
      expect(screen.getByTestId("borrow-confirmation")).toBeInTheDocument();
    });
  });

  describe("404 catch-all", () => {
    it("unknown route shows NotFound page", async () => {
      mockIsLoggedIn.mockReturnValue(false);
      await act(async () => renderApp("/totally-bogus-path"));
      expect(screen.getByTestId("not-found")).toBeInTheDocument();
    });

    it("unknown route shows NotFound when authenticated", async () => {
      mockIsLoggedIn.mockReturnValue(true);
      await act(async () => renderApp("/totally-bogus-path"));
      expect(screen.getByTestId("not-found")).toBeInTheDocument();
    });
  });
});
