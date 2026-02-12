import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./testHelpers";
import AuthPage from "../src/pages/AuthPage";

const mockLogin = vi.fn();
const mockRegister = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockPersistTokens = vi.fn();

vi.mock("../src/lib/ayb", () => ({
  ayb: {
    auth: {
      login: (...args: unknown[]) => mockLogin(...args),
      register: (...args: unknown[]) => mockRegister(...args),
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
    },
  },
  persistTokens: (...args: unknown[]) => mockPersistTokens(...args),
}));

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderAuth(mode: "login" | "register", onAuth = vi.fn()) {
  return {
    onAuth,
    ...renderWithProviders(<AuthPage mode={mode} onAuth={onAuth} />),
  };
}

describe("AuthPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Static rendering ---

  it("renders login form", () => {
    renderAuth("login");
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("renders register form", () => {
    renderAuth("register");
    expect(screen.getByText("Create your account")).toBeInTheDocument();
    expect(screen.getByText("Create Account")).toBeInTheDocument();
  });

  it("shows link to signup from login", () => {
    renderAuth("login");
    expect(screen.getByText("Sign up")).toBeInTheDocument();
  });

  it("shows link to login from signup", () => {
    renderAuth("register");
    expect(screen.getByText("Sign in")).toBeInTheDocument();
  });

  it("renders Shareborough branding", () => {
    renderAuth("login");
    expect(screen.getByText("Shareborough")).toBeInTheDocument();
  });

  // --- OAuth buttons rendering ---

  it("renders Google OAuth button", () => {
    renderAuth("login");
    expect(screen.getByText("Continue with Google")).toBeInTheDocument();
  });

  it("renders GitHub OAuth button", () => {
    renderAuth("login");
    expect(screen.getByText("Continue with GitHub")).toBeInTheDocument();
  });

  it("renders or divider between OAuth and email form", () => {
    renderAuth("login");
    expect(screen.getByText("or")).toBeInTheDocument();
  });

  it("shows OAuth buttons on register page too", () => {
    renderAuth("register");
    expect(screen.getByText("Continue with Google")).toBeInTheDocument();
    expect(screen.getByText("Continue with GitHub")).toBeInTheDocument();
  });

  // --- Form submission behavior ---

  it("calls login and navigates on successful sign in", async () => {
    mockLogin.mockResolvedValue({});
    const onAuth = vi.fn();

    renderAuth("login", onAuth);

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "alice@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.submit(screen.getByText("Sign In").closest("form")!);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("alice@example.com", "password123");
    });
    expect(mockPersistTokens).toHaveBeenCalled();
    expect(onAuth).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  it("calls register on successful sign up", async () => {
    mockRegister.mockResolvedValue({});
    const onAuth = vi.fn();

    renderAuth("register", onAuth);

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "bob@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "securepass" },
    });
    fireEvent.submit(screen.getByText("Create Account").closest("form")!);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith("bob@example.com", "securepass");
    });
    expect(mockPersistTokens).toHaveBeenCalled();
    expect(onAuth).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  it("shows error message on login failure", async () => {
    mockLogin.mockRejectedValue(new Error("Invalid credentials"));

    renderAuth("login");

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "bad@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "wrong" },
    });
    fireEvent.submit(screen.getByText("Sign In").closest("form")!);

    expect(await screen.findByText("The email or password you entered is incorrect.")).toBeInTheDocument();
  });

  it("shows loading state during submission", async () => {
    // Login that never resolves — stays in loading
    mockLogin.mockReturnValue(new Promise(() => {}));

    renderAuth("login");

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password" },
    });
    fireEvent.submit(screen.getByText("Sign In").closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("...")).toBeInTheDocument();
    });
  });

  // --- OAuth button behavior ---

  it("clicking Google button calls signInWithOAuth('google')", async () => {
    mockSignInWithOAuth.mockResolvedValue({
      token: "t",
      refreshToken: "r",
      user: { id: "1", email: "a@b.com" },
    });
    const onAuth = vi.fn();

    renderAuth("login", onAuth);
    fireEvent.click(screen.getByText("Continue with Google"));

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith("google");
    });
    expect(onAuth).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  it("clicking GitHub button calls signInWithOAuth('github')", async () => {
    mockSignInWithOAuth.mockResolvedValue({
      token: "t",
      refreshToken: "r",
      user: { id: "1", email: "a@b.com" },
    });
    const onAuth = vi.fn();

    renderAuth("login", onAuth);
    fireEvent.click(screen.getByText("Continue with GitHub"));

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith("github");
    });
    expect(onAuth).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  it("shows error when OAuth fails", async () => {
    mockSignInWithOAuth.mockRejectedValue(new Error("Failed to fetch"));

    renderAuth("login");
    fireEvent.click(screen.getByText("Continue with Google"));

    expect(
      await screen.findByText("Unable to reach the server. Please check your internet connection and try again."),
    ).toBeInTheDocument();
  });

  it("disables both OAuth buttons during pending OAuth", async () => {
    // OAuth that never resolves
    mockSignInWithOAuth.mockReturnValue(new Promise(() => {}));

    renderAuth("login");
    fireEvent.click(screen.getByText("Continue with Google"));

    await waitFor(() => {
      const googleBtn = screen.getByText("Continue with Google").closest("button")!;
      const githubBtn = screen.getByText("Continue with GitHub").closest("button")!;
      expect(googleBtn).toBeDisabled();
      expect(githubBtn).toBeDisabled();
    });
  });

  it("re-enables OAuth buttons after OAuth error", async () => {
    mockSignInWithOAuth.mockRejectedValue(new Error("popup was closed"));

    renderAuth("login");
    fireEvent.click(screen.getByText("Continue with Google"));

    // Wait for error to appear (loading cleared)
    await waitFor(() => {
      expect(screen.getByText("popup was closed")).toBeInTheDocument();
    });

    // Buttons should be re-enabled
    const googleBtn = screen.getByText("Continue with Google").closest("button")!;
    const githubBtn = screen.getByText("Continue with GitHub").closest("button")!;
    expect(googleBtn).not.toBeDisabled();
    expect(githubBtn).not.toBeDisabled();
  });
});
