import { render, screen, fireEvent } from "@testing-library/react";
import ContactImport from "../src/components/ContactImport";

describe("ContactImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no Contact Picker API
    Object.defineProperty(navigator, "contacts", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "ContactsManager", {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  it("renders manual-only button when Contact Picker API unavailable", () => {
    render(<ContactImport onImport={vi.fn()} />);
    // Should show the button with the label (no separate "Add Manually" since picker not available)
    expect(screen.getByText("Import Contacts")).toBeInTheDocument();
  });

  it("shows manual entry form when button clicked", () => {
    render(<ContactImport onImport={vi.fn()} />);
    fireEvent.click(screen.getByText("Import Contacts"));
    expect(screen.getByPlaceholderText("Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Phone")).toBeInTheDocument();
    expect(screen.getByText("Add")).toBeInTheDocument();
  });

  it("stages contacts when added manually", () => {
    render(<ContactImport onImport={vi.fn()} />);
    fireEvent.click(screen.getByText("Import Contacts"));

    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "Alice" },
    });
    fireEvent.change(screen.getByPlaceholderText("Phone"), {
      target: { value: "4053069556" },
    });
    fireEvent.click(screen.getByText("Add"));

    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/4053069556/)).toBeInTheDocument();
  });

  it("clears inputs after adding a contact", () => {
    render(<ContactImport onImport={vi.fn()} />);
    fireEvent.click(screen.getByText("Import Contacts"));

    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "Alice" },
    });
    fireEvent.change(screen.getByPlaceholderText("Phone"), {
      target: { value: "4053069556" },
    });
    fireEvent.click(screen.getByText("Add"));

    const nameInput = screen.getByPlaceholderText("Name") as HTMLInputElement;
    const phoneInput = screen.getByPlaceholderText("Phone") as HTMLInputElement;
    expect(nameInput.value).toBe("");
    expect(phoneInput.value).toBe("");
  });

  it("removes staged contact when Remove clicked", () => {
    render(<ContactImport onImport={vi.fn()} />);
    fireEvent.click(screen.getByText("Import Contacts"));

    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "Alice" },
    });
    fireEvent.change(screen.getByPlaceholderText("Phone"), {
      target: { value: "4053069556" },
    });
    fireEvent.click(screen.getByText("Add"));

    fireEvent.click(screen.getByText("Remove"));
    expect(screen.queryByText(/4053069556/)).not.toBeInTheDocument();
  });

  it("calls onImport with staged contacts on submit", () => {
    const onImport = vi.fn();
    render(<ContactImport onImport={onImport} />);
    fireEvent.click(screen.getByText("Import Contacts"));

    // Add two contacts
    fireEvent.change(screen.getByPlaceholderText("Name"), { target: { value: "Alice" } });
    fireEvent.change(screen.getByPlaceholderText("Phone"), { target: { value: "111" } });
    fireEvent.click(screen.getByText("Add"));

    fireEvent.change(screen.getByPlaceholderText("Name"), { target: { value: "Bob" } });
    fireEvent.change(screen.getByPlaceholderText("Phone"), { target: { value: "222" } });
    fireEvent.click(screen.getByText("Add"));

    fireEvent.click(screen.getByText("Import 2 contacts"));

    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onImport).toHaveBeenCalledWith([
      { name: "Alice", phone: "111" },
      { name: "Bob", phone: "222" },
    ]);
  });

  it("disables import button when no contacts staged", () => {
    render(<ContactImport onImport={vi.fn()} />);
    fireEvent.click(screen.getByText("Import Contacts"));

    const importBtn = screen.getByText("Import 0 contacts");
    expect(importBtn).toBeDisabled();
  });

  it("disables Add button when inputs are empty", () => {
    render(<ContactImport onImport={vi.fn()} />);
    fireEvent.click(screen.getByText("Import Contacts"));

    expect(screen.getByText("Add")).toBeDisabled();
  });

  it("hides manual form on Cancel", () => {
    render(<ContactImport onImport={vi.fn()} />);
    fireEvent.click(screen.getByText("Import Contacts"));

    expect(screen.getByPlaceholderText("Name")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cancel"));

    expect(screen.queryByPlaceholderText("Name")).not.toBeInTheDocument();
  });

  it("respects custom buttonLabel prop", () => {
    render(<ContactImport onImport={vi.fn()} buttonLabel="Add Friends" />);
    expect(screen.getByText("Add Friends")).toBeInTheDocument();
  });

  it("shows Add Manually button when Contact Picker is available", () => {
    Object.defineProperty(navigator, "contacts", {
      value: { select: vi.fn() },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "ContactsManager", {
      value: function() {},
      writable: true,
      configurable: true,
    });
    render(<ContactImport onImport={vi.fn()} />);

    expect(screen.getByText("Import Contacts")).toBeInTheDocument();
    expect(screen.getByText("Add Manually")).toBeInTheDocument();
  });

  it("import button opens manual entry regardless of Contact Picker", () => {
    render(<ContactImport onImport={vi.fn()} />);
    expect(screen.getByText("Import Contacts")).toBeInTheDocument();
    // Clicking should open manual form
    fireEvent.click(screen.getByText("Import Contacts"));
    expect(screen.getByPlaceholderText("Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Phone")).toBeInTheDocument();
  });

  it("plural vs singular contact text", () => {
    render(<ContactImport onImport={vi.fn()} />);
    fireEvent.click(screen.getByText("Import Contacts"));

    expect(screen.getByText("Import 0 contacts")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Name"), { target: { value: "Alice" } });
    fireEvent.change(screen.getByPlaceholderText("Phone"), { target: { value: "111" } });
    fireEvent.click(screen.getByText("Add"));

    expect(screen.getByText("Import 1 contact")).toBeInTheDocument();
  });

  it("cancel clears staged contacts", () => {
    render(<ContactImport onImport={vi.fn()} />);
    fireEvent.click(screen.getByText("Import Contacts"));

    fireEvent.change(screen.getByPlaceholderText("Name"), { target: { value: "Alice" } });
    fireEvent.change(screen.getByPlaceholderText("Phone"), { target: { value: "111" } });
    fireEvent.click(screen.getByText("Add"));
    expect(screen.getByText(/Alice/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancel"));

    fireEvent.click(screen.getByText("Import Contacts"));
    expect(screen.queryByText(/Alice/)).not.toBeInTheDocument();
    expect(screen.getByText("Import 0 contacts")).toBeInTheDocument();
  });

  it("trims whitespace from inputs", () => {
    const onImport = vi.fn();
    render(<ContactImport onImport={onImport} />);
    fireEvent.click(screen.getByText("Import Contacts"));

    fireEvent.change(screen.getByPlaceholderText("Name"), { target: { value: "  Alice  " } });
    fireEvent.change(screen.getByPlaceholderText("Phone"), { target: { value: "  111  " } });
    fireEvent.click(screen.getByText("Add"));
    fireEvent.click(screen.getByText("Import 1 contact"));

    expect(onImport).toHaveBeenCalledWith([{ name: "Alice", phone: "111" }]);
  });

  it("blocks add when name is whitespace only", () => {
    render(<ContactImport onImport={vi.fn()} />);
    fireEvent.click(screen.getByText("Import Contacts"));

    fireEvent.change(screen.getByPlaceholderText("Name"), { target: { value: "   " } });
    fireEvent.change(screen.getByPlaceholderText("Phone"), { target: { value: "111" } });

    expect(screen.getByText("Add")).toBeDisabled();
  });

  it("phone input has type=tel", () => {
    render(<ContactImport onImport={vi.fn()} />);
    fireEvent.click(screen.getByText("Import Contacts"));

    const phoneInput = screen.getByPlaceholderText("Phone");
    expect(phoneInput).toHaveAttribute("type", "tel");
  });

  it("blocks add when phone is whitespace only", () => {
    render(<ContactImport onImport={vi.fn()} />);
    fireEvent.click(screen.getByText("Import Contacts"));

    fireEvent.change(screen.getByPlaceholderText("Name"), { target: { value: "Alice" } });
    fireEvent.change(screen.getByPlaceholderText("Phone"), { target: { value: "   " } });

    expect(screen.getByText("Add")).toBeDisabled();
  });
});
