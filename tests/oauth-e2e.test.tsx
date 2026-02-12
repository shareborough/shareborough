/**
 * OAuth E2E Behavior-Driven Acceptance Tests
 *
 * Tests the complete OAuth authentication flow from the user's perspective.
 * Based on the behavior spec in docs/BEHAVIORS.md section 1.3 and
 * handoffs/051-session-checklist.md Phase 4.
 *
 * These tests exercise the AuthPage component with realistic OAuth scenarios,
 * verifying button presence, loading states, error handling, and navigation.
 */
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./testHelpers";
import AuthPage from "../src/pages/AuthPage";

// --- Mock setup ---

const mockLogin = vi.fn();
const mockRegister = vi.fn();
const mockSignInWithOAuth = vi.fn();

vi.mock("../src/lib/ayb", () => ({
  ayb: {
    auth: {
      login: (...args: unknown[]) => mockLogin(...args),
      register: (...args: unknown[]) => mockRegister(...args),
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
    },
  },
  persistTokens: vi.fn(),
}));

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderLogin(onAuth = vi.fn()) {
  return {
    onAuth,
    ...renderWithProviders(<AuthPage mode="login" onAuth={onAuth} />),
  };
}

function renderRegister(onAuth = vi.fn()) {
  return {
    onAuth,
    ...renderWithProviders(<AuthPage mode="register" onAuth={onAuth} />),
  };
}

// --- Behavior Tests ---

describe("B1: OAuth Buttons Presence", () => {
  beforeEach(() => vi.clearAllMocks());

  it("login page shows Continue with Google button", () => {
    renderLogin();
    const btn = screen.getByText("Continue with Google");
    expect(btn).toBeInTheDocument();
    expect(btn.closest("button")).not.toBeNull();
  });

  it("login page shows Continue with GitHub button", () => {
    renderLogin();
    const btn = screen.getByText("Continue with GitHub");
    expect(btn).toBeInTheDocument();
    expect(btn.closest("button")).not.toBeNull();
  });

  it("OAuth buttons appear above the email form", () => {
    renderLogin();
    const googleBtn = screen.getByText("Continue with Google");
    const emailInput = screen.getByPlaceholderText("Email");
    // Google button should appear in DOM before email input
    const allElements = document.querySelectorAll("button, input");
    const btnIndex = Array.from(allElements).indexOf(googleBtn.closest("button")!);
    const inputIndex = Array.from(allElements).indexOf(emailInput);
    expect(btnIndex).toBeLessThan(inputIndex);
  });

  it("or divider separates social auth from email auth", () => {
    renderLogin();
    expect(screen.getByText("or")).toBeInTheDocument();
  });
});

describe("B2: OAuth Buttons on Registration", () => {
  beforeEach(() => vi.clearAllMocks());

  it("register page shows the same OAuth buttons as login", () => {
    renderRegister();
    expect(screen.getByText("Continue with Google")).toBeInTheDocument();
    expect(screen.getByText("Continue with GitHub")).toBeInTheDocument();
    expect(screen.getByText("or")).toBeInTheDocument();
  });
});

describe("B3: Google OAuth Flow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("clicking Google button initiates OAuth with correct provider", async () => {
    mockSignInWithOAuth.mockResolvedValue({
      token: "google-token",
      refreshToken: "google-refresh",
      user: { id: "g1", email: "user@gmail.com" },
    });

    const onAuth = vi.fn();
    renderLogin(onAuth);
    fireEvent.click(screen.getByText("Continue with Google"));

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledTimes(1);
      expect(mockSignInWithOAuth).toHaveBeenCalledWith("google");
    });
  });

  it("shows loading spinner on Google button during auth", async () => {
    mockSignInWithOAuth.mockReturnValue(new Promise(() => {}));

    renderLogin();
    fireEvent.click(screen.getByText("Continue with Google"));

    await waitFor(() => {
      const googleBtn = screen.getByText("Continue with Google").closest("button")!;
      // The button should contain an animate-spin SVG
      expect(googleBtn.querySelector(".animate-spin")).not.toBeNull();
    });
  });

  it("disables both OAuth buttons during Google auth", async () => {
    mockSignInWithOAuth.mockReturnValue(new Promise(() => {}));

    renderLogin();
    fireEvent.click(screen.getByText("Continue with Google"));

    await waitFor(() => {
      expect(screen.getByText("Continue with Google").closest("button")).toBeDisabled();
      expect(screen.getByText("Continue with GitHub").closest("button")).toBeDisabled();
    });
  });
});

describe("B4: GitHub OAuth Flow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("clicking GitHub button initiates OAuth with correct provider", async () => {
    mockSignInWithOAuth.mockResolvedValue({
      token: "gh-token",
      refreshToken: "gh-refresh",
      user: { id: "gh1", email: "user@github.com" },
    });

    renderLogin();
    fireEvent.click(screen.getByText("Continue with GitHub"));

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledTimes(1);
      expect(mockSignInWithOAuth).toHaveBeenCalledWith("github");
    });
  });

  it("shows loading spinner on GitHub button during auth", async () => {
    mockSignInWithOAuth.mockReturnValue(new Promise(() => {}));

    renderLogin();
    fireEvent.click(screen.getByText("Continue with GitHub"));

    await waitFor(() => {
      const githubBtn = screen.getByText("Continue with GitHub").closest("button")!;
      expect(githubBtn.querySelector(".animate-spin")).not.toBeNull();
    });
  });
});

describe("B5: Successful OAuth Authentication", () => {
  beforeEach(() => vi.clearAllMocks());

  it("navigates to /dashboard on success", async () => {
    mockSignInWithOAuth.mockResolvedValue({
      token: "t",
      refreshToken: "r",
      user: { id: "1", email: "a@b.com" },
    });

    const onAuth = vi.fn();
    renderLogin(onAuth);
    fireEvent.click(screen.getByText("Continue with Google"));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("calls onAuth callback on success", async () => {
    mockSignInWithOAuth.mockResolvedValue({
      token: "t",
      refreshToken: "r",
      user: { id: "1", email: "a@b.com" },
    });

    const onAuth = vi.fn();
    renderLogin(onAuth);
    fireEvent.click(screen.getByText("Continue with Google"));

    await waitFor(() => {
      expect(onAuth).toHaveBeenCalledTimes(1);
    });
  });
});

describe("B6: OAuth Provider Error", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows user-friendly error message", async () => {
    mockSignInWithOAuth.mockRejectedValue(new Error("Failed to fetch"));

    renderLogin();
    fireEvent.click(screen.getByText("Continue with Google"));

    expect(
      await screen.findByText(
        "Unable to reach the server. Please check your internet connection and try again.",
      ),
    ).toBeInTheDocument();
  });

  it("clears loading state after error", async () => {
    mockSignInWithOAuth.mockRejectedValue(new Error("some error"));

    renderLogin();
    fireEvent.click(screen.getByText("Continue with Google"));

    await waitFor(() => {
      expect(screen.getByText("Continue with Google").closest("button")).not.toBeDisabled();
      expect(screen.getByText("Continue with GitHub").closest("button")).not.toBeDisabled();
    });
  });

  it("user remains on auth page after error", async () => {
    mockSignInWithOAuth.mockRejectedValue(new Error("some error"));

    renderLogin();
    fireEvent.click(screen.getByText("Continue with Google"));

    await waitFor(() => {
      expect(screen.getByText("some error")).toBeInTheDocument();
    });
    // Should NOT have navigated
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe("B7: User Closes OAuth Popup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows appropriate message when popup closed", async () => {
    // The AYBError message for popup close
    mockSignInWithOAuth.mockRejectedValue(
      new Error("OAuth popup was closed by the user"),
    );

    renderLogin();
    fireEvent.click(screen.getByText("Continue with Google"));

    await waitFor(() => {
      expect(screen.getByText("OAuth popup was closed by the user")).toBeInTheDocument();
    });
  });

  it("re-enables buttons so user can retry", async () => {
    mockSignInWithOAuth.mockRejectedValue(
      new Error("OAuth popup was closed by the user"),
    );

    renderLogin();
    fireEvent.click(screen.getByText("Continue with Google"));

    await waitFor(() => {
      expect(screen.getByText("Continue with Google").closest("button")).not.toBeDisabled();
    });
  });
});

describe("B8: SSE Connection Failure", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows connection error message when backend unreachable", async () => {
    mockSignInWithOAuth.mockRejectedValue(
      new Error("Failed to connect to OAuth SSE channel"),
    );

    renderLogin();
    fireEvent.click(screen.getByText("Continue with Google"));

    await waitFor(() => {
      expect(screen.getByText("Failed to connect to OAuth SSE channel")).toBeInTheDocument();
    });
  });

  it("clears loading state on SSE failure", async () => {
    mockSignInWithOAuth.mockRejectedValue(
      new Error("Failed to connect to OAuth SSE channel"),
    );

    renderLogin();
    fireEvent.click(screen.getByText("Continue with Google"));

    await waitFor(() => {
      expect(screen.getByText("Continue with Google").closest("button")).not.toBeDisabled();
    });
  });
});

describe("B9/B10: Login and Register both show OAuth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("login page has both OAuth and email auth", () => {
    renderLogin();
    expect(screen.getByText("Continue with Google")).toBeInTheDocument();
    expect(screen.getByText("Continue with GitHub")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("register page has both OAuth and email auth", () => {
    renderRegister();
    expect(screen.getByText("Continue with Google")).toBeInTheDocument();
    expect(screen.getByText("Continue with GitHub")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByText("Create Account")).toBeInTheDocument();
  });
});
