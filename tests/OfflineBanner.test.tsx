import { render, screen, act, fireEvent } from "@testing-library/react";
import OfflineBanner from "../src/components/OfflineBanner";

// We test OfflineBanner by controlling the fetch mock that useHealthCheck calls
const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  globalThis.fetch = originalFetch;
});

function mockFetchOnline() {
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
}

function mockFetchOffline() {
  globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
}

describe("OfflineBanner", () => {
  it("is not visible when server is online", async () => {
    mockFetchOnline();
    await act(async () => {
      render(<OfflineBanner />);
    });
    expect(
      screen.queryByText("Unable to reach the server. Your changes may not be saved."),
    ).not.toBeInTheDocument();
  });

  it("shows banner when server is offline", async () => {
    mockFetchOffline();
    await act(async () => {
      render(<OfflineBanner />);
    });
    expect(
      screen.getByText("Unable to reach the server. Your changes may not be saved."),
    ).toBeInTheDocument();
  });

  it("shows retry button when offline", async () => {
    mockFetchOffline();
    await act(async () => {
      render(<OfflineBanner />);
    });
    expect(screen.getByText(/Retry now/)).toBeInTheDocument();
  });

  it("shows countdown in retry button when offline", async () => {
    mockFetchOffline();
    await act(async () => {
      render(<OfflineBanner />);
    });
    // Initial retry delay is 5s
    expect(screen.getByText("Retry now (5s)")).toBeInTheDocument();
  });

  it("countdown decrements over time", async () => {
    mockFetchOffline();
    await act(async () => {
      render(<OfflineBanner />);
    });
    expect(screen.getByText("Retry now (5s)")).toBeInTheDocument();

    // Advance 1 second
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("Retry now (4s)")).toBeInTheDocument();
  });

  it("hides banner when server comes back online", async () => {
    mockFetchOffline();
    await act(async () => {
      render(<OfflineBanner />);
    });
    expect(
      screen.getByText("Unable to reach the server. Your changes may not be saved."),
    ).toBeInTheDocument();

    // Server comes back
    mockFetchOnline();

    // Advance past the retry delay so it re-checks
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(
      screen.queryByText("Unable to reach the server. Your changes may not be saved."),
    ).not.toBeInTheDocument();
  });

  it("retry now button triggers immediate recheck", async () => {
    mockFetchOffline();
    await act(async () => {
      render(<OfflineBanner />);
    });
    expect(screen.getByText(/Retry now/)).toBeInTheDocument();

    // Now server is back
    mockFetchOnline();

    await act(async () => {
      fireEvent.click(screen.getByText(/Retry now/));
    });

    expect(
      screen.queryByText("Unable to reach the server. Your changes may not be saved."),
    ).not.toBeInTheDocument();
  });

  it("dispatches ayb:reconnected event when coming back online via retry", async () => {
    mockFetchOffline();
    const handler = vi.fn();
    window.addEventListener("ayb:reconnected", handler);

    await act(async () => {
      render(<OfflineBanner />);
    });

    // Server comes back — user clicks retry
    mockFetchOnline();
    await act(async () => {
      fireEvent.click(screen.getByText(/Retry now/));
    });

    expect(handler).toHaveBeenCalled();
    window.removeEventListener("ayb:reconnected", handler);
  });

  it("uses exponential backoff for retry delays", async () => {
    mockFetchOffline();
    await act(async () => {
      render(<OfflineBanner />);
    });

    // First failure: 5s delay
    expect(screen.getByText("Retry now (5s)")).toBeInTheDocument();

    // Wait for first retry to fire (still offline)
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    // Second failure: 10s delay (5 * 2)
    expect(screen.getByText("Retry now (10s)")).toBeInTheDocument();
  });

  it("dispatches ayb:reconnected event when coming back online via automatic timer retry", async () => {
    // This tests the stale-closure bug fix: the reconnected event must fire
    // even when the timer (not the user) triggers the retry
    mockFetchOffline();
    const handler = vi.fn();
    window.addEventListener("ayb:reconnected", handler);

    await act(async () => {
      render(<OfflineBanner />);
    });
    expect(screen.getByText(/Retry now/)).toBeInTheDocument();

    // Server comes back online
    mockFetchOnline();

    // Wait for the automatic timer to fire (5s countdown)
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    // The reconnected event should fire even without user clicking retry
    expect(handler).toHaveBeenCalled();
    window.removeEventListener("ayb:reconnected", handler);
  });
});
