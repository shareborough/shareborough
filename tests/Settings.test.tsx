import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./testHelpers";
import Settings from "../src/pages/Settings";

const mockMe = vi.fn();
const mockList = vi.fn();
const mockUpdate = vi.fn();
const mockCreate = vi.fn();
const mockDeleteAccount = vi.fn();
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../src/lib/ayb", () => ({
  ayb: {
    auth: {
      me: (...args: unknown[]) => mockMe(...args),
      deleteAccount: (...args: unknown[]) => mockDeleteAccount(...args),
    },
    records: {
      list: (...args: unknown[]) => mockList(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

vi.mock("../src/hooks/usePushNotifications", () => ({
  usePushNotifications: () => ({
    permission: "default",
    isSubscribed: false,
    isLoading: false,
    error: null,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    requestPermission: vi.fn(),
  }),
}));

describe("Settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMe.mockResolvedValue({ id: "user-1", email: "alice@example.com" });
    mockList.mockResolvedValue({ items: [] });
  });

  it("renders skeleton loading state initially", () => {
    // Never-resolving promises to stay in loading
    mockMe.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<Settings />);
    expect(screen.getByLabelText("Loading settings")).toBeInTheDocument();
  });

  it("renders Settings heading after load", async () => {
    renderWithProviders(<Settings />);
    expect(await screen.findByText("Settings")).toBeInTheDocument();
  });

  it("displays user email as disabled field", async () => {
    renderWithProviders(<Settings />);
    const emailInput = await screen.findByLabelText("Email");
    expect(emailInput).toHaveValue("alice@example.com");
    expect(emailInput).toBeDisabled();
  });

  it("shows email cannot be changed hint", async () => {
    renderWithProviders(<Settings />);
    expect(await screen.findByText("Email cannot be changed")).toBeInTheDocument();
  });

  it("renders display name input", async () => {
    renderWithProviders(<Settings />);
    expect(await screen.findByLabelText("Display name")).toBeInTheDocument();
  });

  it("renders phone number input", async () => {
    renderWithProviders(<Settings />);
    expect(await screen.findByLabelText("Phone number")).toBeInTheDocument();
  });

  it("renders Save Changes button", async () => {
    renderWithProviders(<Settings />);
    expect(await screen.findByText("Save Changes")).toBeInTheDocument();
  });

  it("populates form from existing profile", async () => {
    mockList.mockResolvedValue({
      items: [{ id: "p1", display_name: "Alice Wonder", phone: "+15551234567" }],
    });

    renderWithProviders(<Settings />);

    await waitFor(() => {
      expect(screen.getByLabelText("Display name")).toHaveValue("Alice Wonder");
    });
    expect(screen.getByLabelText("Phone number")).toHaveValue("+15551234567");
  });

  it("updates existing profile on save", async () => {
    mockList.mockResolvedValue({
      items: [{ id: "p1", display_name: "Alice", phone: "" }],
    });
    mockUpdate.mockResolvedValue({});

    renderWithProviders(<Settings />);
    await screen.findByText("Save Changes");

    fireEvent.change(screen.getByLabelText("Display name"), {
      target: { value: "Alice Updated" },
    });
    fireEvent.submit(screen.getByText("Save Changes").closest("form")!);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith("user_profiles", "p1", {
        display_name: "Alice Updated",
        phone: null,
      });
    });
  });

  it("creates new profile when none exists", async () => {
    // First call on load returns empty, second call on save also returns empty
    mockList.mockResolvedValue({ items: [] });
    mockCreate.mockResolvedValue({});

    renderWithProviders(<Settings />);
    await screen.findByText("Save Changes");

    fireEvent.change(screen.getByLabelText("Display name"), {
      target: { value: "New User" },
    });
    fireEvent.submit(screen.getByText("Save Changes").closest("form")!);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith("user_profiles", {
        display_name: "New User",
        phone: null,
        user_id: "user-1",
      });
    });
  });

  it("shows saving state during submission", async () => {
    mockList.mockResolvedValue({
      items: [{ id: "p1", display_name: "", phone: "" }],
    });
    mockUpdate.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<Settings />);
    await screen.findByText("Save Changes");

    fireEvent.submit(screen.getByText("Save Changes").closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Saving...")).toBeInTheDocument();
    });
  });

  it("shows error message on save failure", async () => {
    mockList.mockResolvedValue({
      items: [{ id: "p1", display_name: "", phone: "" }],
    });
    mockUpdate.mockRejectedValue(new Error("Server error"));

    renderWithProviders(<Settings />);
    await screen.findByText("Save Changes");

    fireEvent.submit(screen.getByText("Save Changes").closest("form")!);

    expect(await screen.findByText("Couldn't save settings")).toBeInTheDocument();
  });

  it("shows phone SMS hint", async () => {
    renderWithProviders(<Settings />);
    expect(
      await screen.findByText("Used for SMS reminders about your loans"),
    ).toBeInTheDocument();
  });

  it("renders footer", async () => {
    renderWithProviders(<Settings />);
    expect(await screen.findByText("Allyourbase")).toBeInTheDocument();
  });

  it("handles profile load gracefully when table does not exist", async () => {
    mockMe.mockResolvedValue({ email: "bob@example.com" });
    mockList.mockRejectedValue(new Error("relation does not exist"));

    renderWithProviders(<Settings />);

    // Should still render the page, not crash
    expect(await screen.findByText("Settings")).toBeInTheDocument();
    expect(screen.getByLabelText("Display name")).toHaveValue("");
  });

  // ========== Account Deletion ==========

  it("renders Danger Zone section with Delete Account button", async () => {
    renderWithProviders(<Settings />);
    expect(await screen.findByText("Danger Zone")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Account" })).toBeInTheDocument();
  });

  it("shows confirmation form when Delete Account is clicked", async () => {
    renderWithProviders(<Settings />);
    await screen.findByText("Danger Zone");

    fireEvent.click(screen.getByRole("button", { name: "Delete Account" }));

    expect(screen.getByLabelText("Confirm email for deletion")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete My Account" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("Delete My Account button is disabled until email matches", async () => {
    renderWithProviders(<Settings />);
    await screen.findByText("Danger Zone");

    fireEvent.click(screen.getByRole("button", { name: "Delete Account" }));

    const deleteBtn = screen.getByRole("button", { name: "Delete My Account" });
    expect(deleteBtn).toBeDisabled();

    // Type wrong email
    fireEvent.change(screen.getByLabelText("Confirm email for deletion"), {
      target: { value: "wrong@example.com" },
    });
    expect(deleteBtn).toBeDisabled();

    // Type correct email
    fireEvent.change(screen.getByLabelText("Confirm email for deletion"), {
      target: { value: "alice@example.com" },
    });
    expect(deleteBtn).not.toBeDisabled();
  });

  it("calls deleteAccount and navigates to / on success", async () => {
    mockDeleteAccount.mockResolvedValue(undefined);
    renderWithProviders(<Settings />);
    await screen.findByText("Danger Zone");

    fireEvent.click(screen.getByRole("button", { name: "Delete Account" }));
    fireEvent.change(screen.getByLabelText("Confirm email for deletion"), {
      target: { value: "alice@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete My Account" }));

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("shows error toast on delete failure", async () => {
    mockDeleteAccount.mockRejectedValue(new Error("Server error"));
    renderWithProviders(<Settings />);
    await screen.findByText("Danger Zone");

    fireEvent.click(screen.getByRole("button", { name: "Delete Account" }));
    fireEvent.change(screen.getByLabelText("Confirm email for deletion"), {
      target: { value: "alice@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete My Account" }));

    expect(await screen.findByText("Couldn't delete account")).toBeInTheDocument();
  });

  it("Cancel button hides confirmation form", async () => {
    renderWithProviders(<Settings />);
    await screen.findByText("Danger Zone");

    fireEvent.click(screen.getByRole("button", { name: "Delete Account" }));
    expect(screen.getByLabelText("Confirm email for deletion")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByLabelText("Confirm email for deletion")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Account" })).toBeInTheDocument();
  });
});
