import { render, screen, act, fireEvent } from "@testing-library/react";
import { ToastProvider, ToastContext } from "../src/contexts/ToastContext";
import { useContext } from "react";

function ToastTrigger() {
  const ctx = useContext(ToastContext)!;
  return (
    <div>
      <button onClick={() => ctx.showSuccess("Done!", "It worked")}>success</button>
      <button onClick={() => ctx.showError("Oops", "Something broke")}>error</button>
      <button onClick={() => ctx.showWarning("Careful", "Watch out")}>warning</button>
    </div>
  );
}

function renderWithToast() {
  return render(
    <ToastProvider>
      <ToastTrigger />
    </ToastProvider>,
  );
}

describe("Toast notifications", () => {
  it("renders success toast with title and message", async () => {
    renderWithToast();

    await act(async () => {
      fireEvent.click(screen.getByText("success"));
    });

    expect(screen.getByText("Done!")).toBeInTheDocument();
    expect(screen.getByText("It worked")).toBeInTheDocument();
  });

  it("renders error toast with title and message", async () => {
    renderWithToast();

    await act(async () => {
      fireEvent.click(screen.getByText("error"));
    });

    expect(screen.getByText("Oops")).toBeInTheDocument();
    expect(screen.getByText("Something broke")).toBeInTheDocument();
  });

  it("renders warning toast with title and message", async () => {
    renderWithToast();

    await act(async () => {
      fireEvent.click(screen.getByText("warning"));
    });

    expect(screen.getByText("Careful")).toBeInTheDocument();
    expect(screen.getByText("Watch out")).toBeInTheDocument();
  });

  it("toast has role=alert for accessibility", async () => {
    renderWithToast();

    await act(async () => {
      fireEvent.click(screen.getByText("success"));
    });

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("dismiss button removes the toast", async () => {
    renderWithToast();

    await act(async () => {
      fireEvent.click(screen.getByText("success"));
    });

    expect(screen.getByText("Done!")).toBeInTheDocument();

    const dismissBtn = screen.getByRole("button", { name: "Dismiss" });
    await act(async () => {
      fireEvent.click(dismissBtn);
    });

    expect(screen.queryByText("Done!")).not.toBeInTheDocument();
  });

  it("success toast auto-dismisses after duration", async () => {
    vi.useFakeTimers();

    renderWithToast();

    await act(async () => {
      fireEvent.click(screen.getByText("success"));
    });

    expect(screen.getByText("Done!")).toBeInTheDocument();

    // Success duration is 4000ms
    await act(async () => {
      vi.advanceTimersByTime(4100);
    });

    expect(screen.queryByText("Done!")).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it("can show multiple toasts at once", async () => {
    renderWithToast();

    await act(async () => {
      fireEvent.click(screen.getByText("success"));
      fireEvent.click(screen.getByText("error"));
    });

    expect(screen.getByText("Done!")).toBeInTheDocument();
    expect(screen.getByText("Oops")).toBeInTheDocument();
  });

  it("limits to 5 visible toasts (removes oldest)", async () => {
    const ctx = { current: null as any };

    function ManyToasts() {
      ctx.current = useContext(ToastContext)!;
      return null;
    }

    render(
      <ToastProvider>
        <ManyToasts />
      </ToastProvider>,
    );

    await act(async () => {
      for (let i = 1; i <= 6; i++) {
        ctx.current.showSuccess(`Toast ${i}`);
      }
    });

    // Toast 1 should be gone (max 5)
    expect(screen.queryByText("Toast 1")).not.toBeInTheDocument();
    // Toasts 2-6 should be present
    expect(screen.getByText("Toast 2")).toBeInTheDocument();
    expect(screen.getByText("Toast 6")).toBeInTheDocument();
  });

  it("error toast has red-themed styling", async () => {
    renderWithToast();

    await act(async () => {
      fireEvent.click(screen.getByText("error"));
    });

    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("border-l-red-500");
  });

  it("success toast has green-themed styling", async () => {
    renderWithToast();

    await act(async () => {
      fireEvent.click(screen.getByText("success"));
    });

    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("border-l-green-500");
  });

  it("warning toast has amber-themed styling", async () => {
    renderWithToast();

    await act(async () => {
      fireEvent.click(screen.getByText("warning"));
    });

    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("border-l-amber-500");
  });
});
