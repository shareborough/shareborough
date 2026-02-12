import { render, type RenderOptions } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "../src/contexts/ToastContext";
import { ThemeProvider } from "../src/contexts/ThemeContext";
import type { ReactElement } from "react";

/**
 * Renders a component wrapped with BrowserRouter, ThemeProvider, and ToastProvider.
 * Use this for any component that calls useToast(), useTheme(), or uses routing.
 */
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <ToastProvider>{ui}</ToastProvider>
      </ThemeProvider>
    </BrowserRouter>,
    options,
  );
}
