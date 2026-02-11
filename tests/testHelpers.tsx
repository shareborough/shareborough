import { render, type RenderOptions } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "../src/contexts/ToastContext";
import type { ReactElement } from "react";

/**
 * Renders a component wrapped with BrowserRouter and ToastProvider.
 * Use this for any component that calls useToast() or uses routing.
 */
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>{ui}</ToastProvider>
    </BrowserRouter>,
    options,
  );
}
