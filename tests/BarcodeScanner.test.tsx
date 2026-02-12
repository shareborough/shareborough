import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// Use vi.hoisted so mock fns are available in the hoisted vi.mock factory
const { mockInit, mockStart, mockStop, mockOnDetected, mockOffDetected } = vi.hoisted(() => ({
  mockInit: vi.fn(),
  mockStart: vi.fn(),
  mockStop: vi.fn(),
  mockOnDetected: vi.fn(),
  mockOffDetected: vi.fn(),
}));

vi.mock("@ericblade/quagga2", () => ({
  default: {
    init: mockInit,
    start: mockStart,
    stop: mockStop,
    onDetected: mockOnDetected,
    offDetected: mockOffDetected,
  },
}));

import BarcodeScanner from "../src/components/BarcodeScanner";

describe("BarcodeScanner", () => {
  const onDetected = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: Quagga.init succeeds
    mockInit.mockImplementation((_config: unknown, callback: (err?: Error) => void) => {
      callback();
    });
  });

  it("renders scanner viewport and cancel button", () => {
    const { container } = render(<BarcodeScanner onDetected={onDetected} onClose={onClose} />);

    expect(container.querySelector(".barcode-scanner-viewport")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("initializes Quagga with correct readers", () => {
    render(<BarcodeScanner onDetected={onDetected} onClose={onClose} />);

    expect(mockInit).toHaveBeenCalledTimes(1);
    const config = mockInit.mock.calls[0][0];
    expect(config.decoder.readers).toContain("ean_reader");
    expect(config.decoder.readers).toContain("upc_reader");
    expect(config.decoder.readers).toContain("ean_8_reader");
    expect(config.decoder.readers).toContain("code_128_reader");
    expect(config.decoder.readers).toContain("code_39_reader");
  });

  it("starts Quagga and registers onDetected after init success", () => {
    render(<BarcodeScanner onDetected={onDetected} onClose={onClose} />);

    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(mockOnDetected).toHaveBeenCalledTimes(1);
  });

  it("shows scanning instruction text after init", () => {
    render(<BarcodeScanner onDetected={onDetected} onClose={onClose} />);

    expect(screen.getByText("Point camera at barcode")).toBeInTheDocument();
  });

  it("calls onClose and stops Quagga when cancel is clicked", () => {
    render(<BarcodeScanner onDetected={onDetected} onClose={onClose} />);

    fireEvent.click(screen.getByText("Cancel"));
    expect(mockStop).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call Quagga.start when init fails", () => {
    mockInit.mockImplementation((_config: unknown, callback: (err?: Error) => void) => {
      callback(new Error("Some error"));
    });

    render(<BarcodeScanner onDetected={onDetected} onClose={onClose} />);

    expect(mockStart).not.toHaveBeenCalled();
  });

  it("shows error when camera permission denied", () => {
    mockInit.mockImplementation((_config: unknown, callback: (err?: Error) => void) => {
      const err = new Error("NotAllowedError");
      err.name = "NotAllowedError";
      callback(err);
    });

    render(<BarcodeScanner onDetected={onDetected} onClose={onClose} />);

    expect(screen.getByText(/Camera permission denied/)).toBeInTheDocument();
    expect(screen.getByText("Close")).toBeInTheDocument();
  });

  it("shows error when no camera found", () => {
    mockInit.mockImplementation((_config: unknown, callback: (err?: Error) => void) => {
      const err = new Error("NotFoundError");
      err.name = "NotFoundError";
      callback(err);
    });

    render(<BarcodeScanner onDetected={onDetected} onClose={onClose} />);

    expect(screen.getByText(/No camera found/)).toBeInTheDocument();
  });

  it("shows generic error for unknown camera errors", () => {
    mockInit.mockImplementation((_config: unknown, callback: (err?: Error) => void) => {
      callback(new Error("Something went wrong"));
    });

    render(<BarcodeScanner onDetected={onDetected} onClose={onClose} />);

    expect(screen.getByText(/Camera error: Something went wrong/)).toBeInTheDocument();
  });

  it("close button on error calls onClose", () => {
    mockInit.mockImplementation((_config: unknown, callback: (err?: Error) => void) => {
      callback(new Error("NotAllowedError"));
    });

    render(<BarcodeScanner onDetected={onDetected} onClose={onClose} />);

    fireEvent.click(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onDetected with code and format when barcode scanned", () => {
    render(<BarcodeScanner onDetected={onDetected} onClose={onClose} />);

    // Simulate barcode detection by calling the registered callback
    const detectedCallback = mockOnDetected.mock.calls[0][0];
    detectedCallback({
      codeResult: { code: "9780134685991", format: "ean_13" },
    });

    expect(onDetected).toHaveBeenCalledWith("9780134685991", "ean_13");
    expect(mockStop).toHaveBeenCalled();
  });

  it("only fires onDetected once (prevents duplicate scans)", () => {
    render(<BarcodeScanner onDetected={onDetected} onClose={onClose} />);

    const detectedCallback = mockOnDetected.mock.calls[0][0];

    // Fire twice
    detectedCallback({ codeResult: { code: "111", format: "ean_13" } });
    detectedCallback({ codeResult: { code: "222", format: "ean_13" } });

    expect(onDetected).toHaveBeenCalledTimes(1);
    expect(onDetected).toHaveBeenCalledWith("111", "ean_13");
  });

  it("ignores null code in detection result", () => {
    render(<BarcodeScanner onDetected={onDetected} onClose={onClose} />);

    const detectedCallback = mockOnDetected.mock.calls[0][0];
    detectedCallback({ codeResult: { code: null, format: "ean_13" } });

    expect(onDetected).not.toHaveBeenCalled();
  });

  it("cleans up Quagga on unmount", () => {
    const { unmount } = render(
      <BarcodeScanner onDetected={onDetected} onClose={onClose} />
    );

    unmount();

    expect(mockOffDetected).toHaveBeenCalled();
    expect(mockStop).toHaveBeenCalled();
  });

  it("uses environment-facing camera", () => {
    render(<BarcodeScanner onDetected={onDetected} onClose={onClose} />);

    const config = mockInit.mock.calls[0][0];
    expect(config.inputStream.constraints.facingMode).toBe("environment");
  });
});
