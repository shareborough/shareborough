import { waitFor, act } from "@testing-library/react";
import { renderWithProviders } from "./testHelpers";

// Mock ayb module
const mockMe = vi.fn();
let mockLoggedIn = true;
const mockValidateSession = vi.fn();

vi.mock("../src/lib/ayb", () => ({
  isLoggedIn: () => mockLoggedIn,
  validateSession: (...args: unknown[]) => mockValidateSession(...args),
  ayb: {
    auth: { me: (...args: unknown[]) => mockMe(...args) },
    records: { list: vi.fn().mockResolvedValue({ items: [] }) },
    realtime: { subscribe: vi.fn(() => () => {}) },
  },
}));

vi.mock("../src/lib/rpc", () => ({
  rpc: vi.fn(),
}));

vi.mock("../src/lib/reminders", () => ({
  scheduleReminders: vi.fn().mockResolvedValue(6),
}));

// Must import App after mocks
import App from "../src/App";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Session Persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoggedIn = true;
    mockValidateSession.mockResolvedValue("valid");
    // Silence health check fetch
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    globalThis.fetch = vi.fn();
  });

  it("validates session on mount when tokens exist", async () => {
    renderWithProviders(<App />);

    await waitFor(() => {
      expect(mockValidateSession).toHaveBeenCalled();
    });
  });

  it("does not validate session when not logged in", async () => {
    mockLoggedIn = false;

    renderWithProviders(<App />);

    // Give it a tick
    await act(async () => {});

    expect(mockValidateSession).not.toHaveBeenCalled();
  });

  it("redirects to login on expired session", async () => {
    mockValidateSession.mockResolvedValue("expired");

    renderWithProviders(<App />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  it("stays on page when session is valid", async () => {
    mockValidateSession.mockResolvedValue("valid");

    renderWithProviders(<App />);

    await waitFor(() => {
      expect(mockValidateSession).toHaveBeenCalled();
    });

    expect(mockNavigate).not.toHaveBeenCalledWith("/login");
  });

  it("stays on page when server is unreachable (offline)", async () => {
    mockValidateSession.mockResolvedValue("offline");

    renderWithProviders(<App />);

    await waitFor(() => {
      expect(mockValidateSession).toHaveBeenCalled();
    });

    // Should NOT redirect — keep tokens, show offline warning
    expect(mockNavigate).not.toHaveBeenCalledWith("/login");
  });

  it("handles ayb:auth-expired event by clearing session", async () => {
    renderWithProviders(<App />);

    await waitFor(() => {
      expect(mockValidateSession).toHaveBeenCalled();
    });

    // Dispatch auth-expired event (from rpc.ts 401 handler)
    await act(async () => {
      window.dispatchEvent(new CustomEvent("ayb:auth-expired"));
    });

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });
});
