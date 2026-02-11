import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import NavBar from "../src/components/NavBar";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const MOCK_PAYLOAD = vi.hoisted(() =>
  btoa(JSON.stringify({ email: "test@example.com", exp: 9999999999 })),
);
const MOCK_TOKEN = vi.hoisted(
  () => `eyJhbGciOiJIUzI1NiJ9.${MOCK_PAYLOAD}.fakesig`,
);
const mockAyb = vi.hoisted(
  () => ({ token: MOCK_TOKEN as string | null }),
);
const mockClearPersistedTokens = vi.hoisted(() => vi.fn());

vi.mock("../src/lib/ayb", () => ({
  ayb: mockAyb,
  clearPersistedTokens: mockClearPersistedTokens,
}));

function renderNavBar(onLogout = vi.fn()) {
  return {
    onLogout,
    ...render(
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <NavBar onLogout={onLogout} />
      </BrowserRouter>,
    ),
  };
}

function openMenu() {
  fireEvent.click(screen.getByLabelText("Account menu"));
}

describe("NavBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAyb.token = MOCK_TOKEN;
  });

  it("renders Shareborough branding", () => {
    renderNavBar();
    expect(screen.getByText("Shareborough")).toBeInTheDocument();
  });

  it("renders logo link to dashboard", () => {
    renderNavBar();
    const logoLink = screen.getByText("Shareborough").closest("a");
    expect(logoLink).toHaveAttribute("href", "/dashboard");
  });

  it("renders My Libraries link in header pointing to dashboard", () => {
    renderNavBar();
    const headerLinks = screen
      .getAllByText("My Libraries")
      .map((el) => el.closest("a"));
    expect(headerLinks[0]).toHaveAttribute("href", "/dashboard");
  });

  it("renders avatar button with account menu label", () => {
    renderNavBar();
    expect(screen.getByLabelText("Account menu")).toBeInTheDocument();
  });

  it("avatar button has aria-expanded=false when menu is closed", () => {
    renderNavBar();
    expect(screen.getByLabelText("Account menu")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  describe("avatar dropdown", () => {
    it("opens on avatar click", () => {
      renderNavBar();
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      openMenu();
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("sets aria-expanded=true when open", () => {
      renderNavBar();
      openMenu();
      expect(screen.getByLabelText("Account menu")).toHaveAttribute(
        "aria-expanded",
        "true",
      );
    });

    it("shows user email", () => {
      renderNavBar();
      openMenu();
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    it("shows My Libraries menu item linking to dashboard", () => {
      renderNavBar();
      openMenu();
      const item = screen.getByRole("menuitem", { name: "My Libraries" });
      expect(item).toHaveAttribute("href", "/dashboard");
    });

    it("shows Settings menu item linking to settings page", () => {
      renderNavBar();
      openMenu();
      const item = screen.getByRole("menuitem", { name: "Settings" });
      expect(item).toHaveAttribute("href", "/dashboard/settings");
    });

    it("shows Sign out menu item", () => {
      renderNavBar();
      openMenu();
      expect(
        screen.getByRole("menuitem", { name: "Sign out" }),
      ).toBeInTheDocument();
    });

    it("sign out clears tokens, calls onLogout, and navigates to /login", () => {
      const onLogout = vi.fn();
      renderNavBar(onLogout);
      openMenu();
      fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));

      expect(mockClearPersistedTokens).toHaveBeenCalled();
      expect(onLogout).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });

    it("sign out closes the menu", () => {
      renderNavBar();
      openMenu();
      fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("closes on Escape key", () => {
      renderNavBar();
      openMenu();
      expect(screen.getByRole("menu")).toBeInTheDocument();
      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("closes when clicking outside", () => {
      renderNavBar();
      openMenu();
      expect(screen.getByRole("menu")).toBeInTheDocument();
      fireEvent.mouseDown(document.body);
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("closes when My Libraries menu item is clicked", () => {
      renderNavBar();
      openMenu();
      fireEvent.click(screen.getByRole("menuitem", { name: "My Libraries" }));
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("closes when Settings menu item is clicked", () => {
      renderNavBar();
      openMenu();
      fireEvent.click(screen.getByRole("menuitem", { name: "Settings" }));
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("toggles closed when avatar is clicked again", () => {
      renderNavBar();
      openMenu();
      expect(screen.getByRole("menu")).toBeInTheDocument();
      fireEvent.click(screen.getByLabelText("Account menu"));
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("has separator between nav items and sign out", () => {
      renderNavBar();
      openMenu();
      expect(screen.getByRole("separator")).toBeInTheDocument();
    });
  });
});

describe("NavBar without token", () => {
  beforeEach(() => {
    mockAyb.token = null;
  });

  afterEach(() => {
    mockAyb.token = MOCK_TOKEN;
  });

  it("shows placeholder avatar when no token", () => {
    render(
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <NavBar onLogout={vi.fn()} />
      </BrowserRouter>,
    );
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("does not show email in dropdown when no token", () => {
    render(
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <NavBar onLogout={vi.fn()} />
      </BrowserRouter>,
    );
    fireEvent.click(screen.getByLabelText("Account menu"));
    expect(screen.queryByText("test@example.com")).not.toBeInTheDocument();
  });
});
