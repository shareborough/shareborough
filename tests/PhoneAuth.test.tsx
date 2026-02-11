import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./testHelpers";
import PhoneAuth from "../src/components/PhoneAuth";

const mockQuickPhoneAuth = vi.fn();
const mockGetPhoneSession = vi.fn();
const mockClearPhoneSession = vi.fn();
const mockRequestOTP = vi.fn();
const mockVerifyOTP = vi.fn();

vi.mock("../src/lib/phoneAuth", () => ({
  quickPhoneAuth: (...args: unknown[]) => mockQuickPhoneAuth(...args),
  getPhoneSession: () => mockGetPhoneSession(),
  clearPhoneSession: () => mockClearPhoneSession(),
  requestOTP: (...args: unknown[]) => mockRequestOTP(...args),
  verifyOTP: (...args: unknown[]) => mockVerifyOTP(...args),
  normalizePhone: (p: string) => `+1${p.replace(/\D/g, "")}`,
}));

describe("PhoneAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPhoneSession.mockReturnValue(null);
  });

  it("renders phone input form by default", () => {
    renderWithProviders(<PhoneAuth onAuth={vi.fn()} />);
    expect(screen.getByPlaceholderText("Your name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Phone number")).toBeInTheDocument();
    expect(screen.getByText("Continue")).toBeInTheDocument();
  });

  it("calls quickPhoneAuth on submit without OTP requirement", async () => {
    const session = { phone: "+14053069556", name: "Alice", verified: false, expiresAt: "2026-12-31" };
    mockQuickPhoneAuth.mockReturnValue(session);
    const onAuth = vi.fn();

    renderWithProviders(<PhoneAuth onAuth={onAuth} />);

    fireEvent.change(screen.getByPlaceholderText("Your name"), {
      target: { value: "Alice" },
    });
    fireEvent.change(screen.getByPlaceholderText("Phone number"), {
      target: { value: "4053069556" },
    });
    fireEvent.submit(screen.getByText("Continue").closest("form")!);

    await waitFor(() => {
      expect(mockQuickPhoneAuth).toHaveBeenCalledWith("4053069556", "Alice");
    });
    expect(onAuth).toHaveBeenCalledWith(session);
  });

  it("shows OTP code input when requireOTP is true and OTP succeeds", async () => {
    mockRequestOTP.mockResolvedValue(undefined);

    renderWithProviders(<PhoneAuth onAuth={vi.fn()} requireOTP />);

    fireEvent.change(screen.getByPlaceholderText("Your name"), {
      target: { value: "Bob" },
    });
    fireEvent.change(screen.getByPlaceholderText("Phone number"), {
      target: { value: "5551234567" },
    });
    fireEvent.submit(screen.getByText("Continue").closest("form")!);

    expect(await screen.findByPlaceholderText("6-digit code")).toBeInTheDocument();
    expect(screen.getByText("Verify")).toBeInTheDocument();
    expect(screen.getByText("Back")).toBeInTheDocument();
  });

  it("falls back to quick auth when OTP request fails", async () => {
    mockRequestOTP.mockRejectedValue(new Error("SMS not configured"));
    const session = { phone: "+15551234567", name: "Bob", verified: false, expiresAt: "2026-12-31" };
    mockQuickPhoneAuth.mockReturnValue(session);
    const onAuth = vi.fn();

    renderWithProviders(<PhoneAuth onAuth={onAuth} requireOTP />);

    fireEvent.change(screen.getByPlaceholderText("Your name"), {
      target: { value: "Bob" },
    });
    fireEvent.change(screen.getByPlaceholderText("Phone number"), {
      target: { value: "5551234567" },
    });
    fireEvent.submit(screen.getByText("Continue").closest("form")!);

    await waitFor(() => {
      expect(mockQuickPhoneAuth).toHaveBeenCalled();
    });
    expect(onAuth).toHaveBeenCalledWith(session);
  });

  it("verifies OTP code successfully", async () => {
    mockRequestOTP.mockResolvedValue(undefined);
    const session = { phone: "+15551234567", name: "Bob", verified: true, expiresAt: "2026-12-31" };
    mockVerifyOTP.mockResolvedValue(session);
    const onAuth = vi.fn();

    renderWithProviders(<PhoneAuth onAuth={onAuth} requireOTP />);

    // Step 1: phone
    fireEvent.change(screen.getByPlaceholderText("Your name"), {
      target: { value: "Bob" },
    });
    fireEvent.change(screen.getByPlaceholderText("Phone number"), {
      target: { value: "5551234567" },
    });
    fireEvent.submit(screen.getByText("Continue").closest("form")!);

    // Step 2: code
    const codeInput = await screen.findByPlaceholderText("6-digit code");
    fireEvent.change(codeInput, { target: { value: "123456" } });
    fireEvent.submit(screen.getByText("Verify").closest("form")!);

    await waitFor(() => {
      expect(mockVerifyOTP).toHaveBeenCalledWith("5551234567", "123456");
      expect(onAuth).toHaveBeenCalled();
    });
  });

  it("shows error on invalid OTP code", async () => {
    expect.assertions(2);
    mockRequestOTP.mockResolvedValue(undefined);
    mockVerifyOTP.mockRejectedValue(new Error("Invalid or expired code"));

    renderWithProviders(<PhoneAuth onAuth={vi.fn()} requireOTP />);

    fireEvent.change(screen.getByPlaceholderText("Your name"), {
      target: { value: "Bob" },
    });
    fireEvent.change(screen.getByPlaceholderText("Phone number"), {
      target: { value: "5551234567" },
    });
    fireEvent.submit(screen.getByText("Continue").closest("form")!);

    const codeInput = await screen.findByPlaceholderText("6-digit code");
    fireEvent.change(codeInput, { target: { value: "000000" } });
    fireEvent.submit(screen.getByText("Verify").closest("form")!);

    expect(await screen.findByText("That code is invalid or has expired. Please try again.")).toBeInTheDocument();
    expect(mockVerifyOTP).toHaveBeenCalledWith("5551234567", "000000");
  });

  it("shows existing session with sign out button", () => {
    mockGetPhoneSession.mockReturnValue({
      phone: "+14053069556",
      name: "Alice",
      verified: false,
      expiresAt: "2026-12-31",
    });

    renderWithProviders(<PhoneAuth onAuth={vi.fn()} />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("+14053069556")).toBeInTheDocument();
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });

  it("clears session on sign out and shows form again", () => {
    mockGetPhoneSession
      .mockReturnValueOnce({ phone: "+14053069556", name: "Alice", verified: false, expiresAt: "2026-12-31" })
      .mockReturnValue(null);

    renderWithProviders(<PhoneAuth onAuth={vi.fn()} />);

    fireEvent.click(screen.getByText("Sign out"));

    expect(mockClearPhoneSession).toHaveBeenCalled();
    expect(screen.getByPlaceholderText("Your name")).toBeInTheDocument();
  });

  it("Back button on OTP screen returns to phone form", async () => {
    mockRequestOTP.mockResolvedValue(undefined);

    renderWithProviders(<PhoneAuth onAuth={vi.fn()} requireOTP />);

    fireEvent.change(screen.getByPlaceholderText("Your name"), {
      target: { value: "Bob" },
    });
    fireEvent.change(screen.getByPlaceholderText("Phone number"), {
      target: { value: "5551234567" },
    });
    fireEvent.submit(screen.getByText("Continue").closest("form")!);

    await screen.findByPlaceholderText("6-digit code");
    fireEvent.click(screen.getByText("Back"));

    expect(screen.getByPlaceholderText("Your name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Phone number")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("6-digit code")).not.toBeInTheDocument();
  });

  it("shows 'Verified' badge for verified session", () => {
    mockGetPhoneSession.mockReturnValue({
      phone: "+14053069556",
      name: "Alice",
      verified: true,
      expiresAt: "2026-12-31",
    });

    renderWithProviders(<PhoneAuth onAuth={vi.fn()} />);

    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.queryByText("Not verified")).not.toBeInTheDocument();
  });

  it("shows 'Not verified' badge and verify prompt for unverified session", () => {
    mockGetPhoneSession.mockReturnValue({
      phone: "+14053069556",
      name: "Alice",
      verified: false,
      expiresAt: "2026-12-31",
    });

    renderWithProviders(<PhoneAuth onAuth={vi.fn()} />);

    expect(screen.getByText("Not verified")).toBeInTheDocument();
    expect(screen.queryByText("Verified")).not.toBeInTheDocument();
    expect(screen.getByText("Verify now")).toBeInTheDocument();
  });
});
