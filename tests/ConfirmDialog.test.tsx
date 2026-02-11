import { render, screen, fireEvent } from "@testing-library/react";
import ConfirmDialog from "../src/components/ConfirmDialog";

function renderDialog(overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const props = {
    open: true,
    title: "Delete item?",
    message: "This cannot be undone.",
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
  const result = render(<ConfirmDialog {...props} />);
  return { ...result, ...props };
}

describe("ConfirmDialog", () => {
  // --- Rendering ---

  it("renders nothing when open is false", () => {
    renderDialog({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders title and message when open", () => {
    renderDialog();
    expect(screen.getByText("Delete item?")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
  });

  it("renders default button labels", () => {
    renderDialog();
    expect(screen.getByText("OK")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("renders custom button labels", () => {
    renderDialog({ confirmLabel: "Delete", cancelLabel: "Keep" });
    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(screen.getByText("Keep")).toBeInTheDocument();
  });

  it("has role=dialog and aria-modal", () => {
    renderDialog();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  // --- Button clicks ---

  it("calls onConfirm when confirm button is clicked", () => {
    const { onConfirm } = renderDialog();
    fireEvent.click(screen.getByText("OK"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when cancel button is clicked", () => {
    const { onCancel } = renderDialog();
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when backdrop is clicked", () => {
    const { onCancel } = renderDialog();
    fireEvent.click(screen.getByTestId("dialog-backdrop"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  // --- Keyboard shortcuts ---

  it("calls onConfirm on Enter key", () => {
    const { onConfirm } = renderDialog();
    fireEvent.keyDown(document, { key: "Enter" });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel on Escape key", () => {
    const { onCancel } = renderDialog();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel on Cmd+Backspace", () => {
    const { onCancel } = renderDialog();
    fireEvent.keyDown(document, { key: "Backspace", metaKey: true });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("ignores keyboard events when closed", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderDialog({ open: false, onConfirm, onCancel });
    fireEvent.keyDown(document, { key: "Enter" });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  // --- Variant styling ---

  it("applies btn-danger class for danger variant", () => {
    renderDialog({ variant: "danger", confirmLabel: "Delete" });
    const btn = screen.getByText("Delete");
    expect(btn.className).toContain("btn-danger");
  });

  it("applies btn-primary class for default variant", () => {
    renderDialog({ variant: "default", confirmLabel: "Confirm" });
    const btn = screen.getByText("Confirm");
    expect(btn.className).toContain("btn-primary");
  });
});
