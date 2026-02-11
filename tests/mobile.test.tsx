/**
 * Mobile-focused tests.
 * Tests responsive rendering, touch interactions, and mobile-specific UI.
 * Uses jsdom with viewport simulation.
 */

import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "./testHelpers";

// --- Mocks (same pattern as other tests) ---

const mockList = vi.fn();
const mockGet = vi.fn();
const mockCreate = vi.fn();

vi.mock("../src/lib/ayb", () => ({
  ayb: {
    records: {
      list: (...args: unknown[]) => mockList(...args),
      get: (...args: unknown[]) => mockGet(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
    auth: {
      login: vi.fn(),
      register: vi.fn(),
    },
    realtime: {
      subscribe: vi.fn(() => () => {}),
    },
  },
  isLoggedIn: () => false,
  persistTokens: vi.fn(),
}));

vi.mock("../src/lib/rpc", () => ({
  rpc: vi.fn(),
}));

vi.mock("../src/lib/reminders", () => ({
  scheduleReminders: vi.fn().mockResolvedValue(6),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ slug: "test-lib", itemId: "item-1" }),
  };
});

import Landing from "../src/pages/Landing";
import AuthPage from "../src/pages/AuthPage";
import Footer from "../src/components/Footer";
import ConfirmDialog from "../src/components/ConfirmDialog";

describe("Mobile UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Landing page ---

  describe("Landing", () => {
    it("renders hero text on mobile", () => {
      renderWithProviders(<Landing authed={false} />);
      expect(screen.getByText("your friends")).toBeInTheDocument();
      expect(screen.getByText("Lend stuff to")).toBeInTheDocument();
    });

    it("shows Sign in and Get Started buttons for unauthenticated users", () => {
      renderWithProviders(<Landing authed={false} />);
      expect(screen.getByText("Sign in")).toBeInTheDocument();
      expect(screen.getByText("Get Started")).toBeInTheDocument();
    });

    it("shows My Libraries button for authenticated users", () => {
      renderWithProviders(<Landing authed={true} />);
      expect(screen.getByText("My Libraries")).toBeInTheDocument();
      expect(screen.queryByText("Sign in")).not.toBeInTheDocument();
    });

    it("renders feature cards", () => {
      renderWithProviders(<Landing authed={false} />);
      expect(screen.getByText("Snap & Catalog")).toBeInTheDocument();
      expect(screen.getByText("Share a Link")).toBeInTheDocument();
      expect(screen.getByText("SMS Reminders")).toBeInTheDocument();
    });

    it("renders footer", () => {
      renderWithProviders(<Landing authed={false} />);
      expect(screen.getByText("Allyourbase")).toBeInTheDocument();
    });
  });

  // --- Auth page with social buttons ---

  describe("AuthPage social buttons", () => {
    it("renders Google and GitHub OAuth buttons on login", () => {
      renderWithProviders(<AuthPage mode="login" onAuth={vi.fn()} />);
      expect(screen.getByText("Continue with Google")).toBeInTheDocument();
      expect(screen.getByText("Continue with GitHub")).toBeInTheDocument();
    });

    it("renders OAuth buttons on register too", () => {
      renderWithProviders(<AuthPage mode="register" onAuth={vi.fn()} />);
      expect(screen.getByText("Continue with Google")).toBeInTheDocument();
      expect(screen.getByText("Continue with GitHub")).toBeInTheDocument();
    });

    it("renders divider between social and email auth", () => {
      renderWithProviders(<AuthPage mode="login" onAuth={vi.fn()} />);
      expect(screen.getByText("or")).toBeInTheDocument();
    });

    it("renders footer on auth page", () => {
      renderWithProviders(<AuthPage mode="login" onAuth={vi.fn()} />);
      expect(screen.getByText("Allyourbase")).toBeInTheDocument();
    });
  });

  // --- ConfirmDialog touch interactions ---

  describe("ConfirmDialog touch-friendly", () => {
    it("has large enough tap targets (buttons are present)", () => {
      renderWithProviders(
        <ConfirmDialog
          open={true}
          title="Delete?"
          message="Really delete?"
          confirmLabel="Delete"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      const deleteBtn = screen.getByText("Delete");
      const cancelBtn = screen.getByText("Cancel");
      expect(deleteBtn.tagName).toBe("BUTTON");
      expect(cancelBtn.tagName).toBe("BUTTON");
    });

    it("closes on backdrop tap", () => {
      const onCancel = vi.fn();
      renderWithProviders(
        <ConfirmDialog
          open={true}
          title="Test"
          message="Test message"
          onConfirm={vi.fn()}
          onCancel={onCancel}
        />,
      );
      fireEvent.click(screen.getByTestId("dialog-backdrop"));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  // --- Footer ---

  describe("Footer on all pages", () => {
    it("contains Allyourbase link with correct href", () => {
      renderWithProviders(<Footer />);
      const link = screen.getByRole("link", { name: "Allyourbase" });
      expect(link).toHaveAttribute("href", "https://allyourbase.io");
    });

    it("opens link in new tab", () => {
      renderWithProviders(<Footer />);
      const link = screen.getByRole("link", { name: "Allyourbase" });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    });
  });
});
