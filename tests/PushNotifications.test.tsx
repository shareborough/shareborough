import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePushNotifications } from "../src/hooks/usePushNotifications";

// Mock ayb client
vi.mock("../src/lib/ayb", () => ({
  ayb: {
    records: {
      list: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe("usePushNotifications", () => {
  let mockRegistration: Partial<ServiceWorkerRegistration>;
  let mockPushManager: Partial<PushManager>;
  let mockSubscription: Partial<PushSubscription>;

  beforeEach(() => {
    // Mock PushSubscription
    mockSubscription = {
      endpoint: "https://push.example.com/subscription-id",
      getKey: vi.fn((name: PushEncryptionKeyName) => {
        if (name === "p256dh") {
          return new Uint8Array([1, 2, 3, 4]).buffer;
        }
        if (name === "auth") {
          return new Uint8Array([5, 6, 7, 8]).buffer;
        }
        return null;
      }),
      unsubscribe: vi.fn().mockResolvedValue(true),
    };

    // Mock PushManager
    mockPushManager = {
      getSubscription: vi.fn().mockResolvedValue(null),
      subscribe: vi.fn().mockResolvedValue(mockSubscription),
    };

    // Mock ServiceWorkerRegistration
    mockRegistration = {
      pushManager: mockPushManager as PushManager,
    };

    // Mock navigator.serviceWorker
    Object.defineProperty(global, "navigator", {
      value: {
        serviceWorker: {
          ready: Promise.resolve(mockRegistration),
        },
      },
      writable: true,
      configurable: true,
    });

    // Mock Notification API
    Object.defineProperty(global, "Notification", {
      value: {
        permission: "default",
        requestPermission: vi.fn().mockResolvedValue("granted"),
      },
      writable: true,
      configurable: true,
    });

    // Mock window methods
    global.atob = vi.fn((str) => str);
    global.btoa = vi.fn((str) => str);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should check permission and subscription state on mount", async () => {
      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.permission).toBe("default");
      expect(result.current.isSubscribed).toBe(false);
    });

    it("should detect existing subscription on mount", async () => {
      mockPushManager.getSubscription = vi
        .fn()
        .mockResolvedValue(mockSubscription);

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isSubscribed).toBe(true);
    });

    it("should handle unsupported browsers", async () => {
      Object.defineProperty(global, "Notification", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(global.navigator, "serviceWorker", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 3000 }
      );

      expect(result.current.error).toBe("Push notifications not supported");
    });
  });

  describe("requestPermission", () => {
    it("should request notification permission", async () => {
      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success = false;
      await act(async () => {
        success = await result.current.requestPermission();
      });

      expect(success).toBe(true);
      expect(Notification.requestPermission).toHaveBeenCalled();
      expect(result.current.permission).toBe("granted");
    });

    it("should return true if permission already granted", async () => {
      Object.defineProperty(Notification, "permission", {
        value: "granted",
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success = false;
      await act(async () => {
        success = await result.current.requestPermission();
      });

      expect(success).toBe(true);
      expect(Notification.requestPermission).not.toHaveBeenCalled();
    });

    it("should handle permission denial", async () => {
      (Notification.requestPermission as any).mockResolvedValue("denied");

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success = true;
      await act(async () => {
        success = await result.current.requestPermission();
      });

      expect(success).toBe(false);
      expect(result.current.permission).toBe("denied");
    });

    it("should handle unsupported notification API", async () => {
      Object.defineProperty(global, "Notification", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(global.navigator, "serviceWorker", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 3000 }
      );

      let success = true;
      await act(async () => {
        success = await result.current.requestPermission();
      });

      expect(success).toBe(false);
      expect(result.current.error).toBeTruthy();
    });
  });

  describe("subscribe", () => {
    it("should subscribe to push notifications successfully", async () => {
      const { ayb } = await import("../src/lib/ayb");

      (ayb.records.list as any).mockResolvedValue({
        items: [{ public_key: "test-vapid-key" }],
      });
      (ayb.records.create as any).mockResolvedValue({ id: "sub-123" });

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success = false;
      await act(async () => {
        success = await result.current.subscribe();
      });

      expect(success).toBe(true);
      expect(result.current.isSubscribed).toBe(true);
      expect(ayb.records.create).toHaveBeenCalledWith(
        "push_subscriptions",
        expect.objectContaining({
          endpoint: "https://push.example.com/subscription-id",
        })
      );
    });

    it("should fail if permission is denied", async () => {
      (Notification.requestPermission as any).mockResolvedValue("denied");

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success = true;
      await act(async () => {
        success = await result.current.subscribe();
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe("Notification permission denied");
    });

    it("should handle missing VAPID key", async () => {
      const { ayb } = await import("../src/lib/ayb");

      (ayb.records.list as any).mockResolvedValue({ items: [] });

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success = true;
      await act(async () => {
        success = await result.current.subscribe();
      });

      expect(success).toBe(false);
      expect(result.current.error).toContain("VAPID");
    });

    it("should handle subscription errors", async () => {
      const { ayb } = await import("../src/lib/ayb");

      (ayb.records.list as any).mockResolvedValue({
        items: [{ public_key: "test-vapid-key" }],
      });

      mockPushManager.subscribe = vi
        .fn()
        .mockRejectedValue(new Error("Subscription failed"));

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success = true;
      await act(async () => {
        success = await result.current.subscribe();
      });

      expect(success).toBe(false);
      expect(result.current.error).toBeTruthy();
    });
  });

  describe("unsubscribe", () => {
    it("should unsubscribe from push notifications", async () => {
      const { ayb } = await import("../src/lib/ayb");

      mockPushManager.getSubscription = vi
        .fn()
        .mockResolvedValue(mockSubscription);

      (ayb.records.list as any).mockResolvedValue({
        items: [{ id: "sub-123" }],
      });
      (ayb.records.delete as any).mockResolvedValue({});

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success = false;
      await act(async () => {
        success = await result.current.unsubscribe();
      });

      expect(success).toBe(true);
      expect(result.current.isSubscribed).toBe(false);
      expect(ayb.records.delete).toHaveBeenCalledWith(
        "push_subscriptions",
        "sub-123"
      );
      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    });

    it("should handle no existing subscription", async () => {
      mockPushManager.getSubscription = vi.fn().mockResolvedValue(null);

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success = false;
      await act(async () => {
        success = await result.current.unsubscribe();
      });

      expect(success).toBe(true);
      expect(result.current.isSubscribed).toBe(false);
    });

    it("should handle unsubscription errors", async () => {
      mockPushManager.getSubscription = vi
        .fn()
        .mockResolvedValue(mockSubscription);
      mockSubscription.unsubscribe = vi
        .fn()
        .mockRejectedValue(new Error("Unsubscribe failed"));

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success = true;
      await act(async () => {
        success = await result.current.unsubscribe();
      });

      expect(success).toBe(false);
      expect(result.current.error).toBeTruthy();
    });
  });
});

describe("Push Notification Helper Functions", () => {
  it("should convert URL-safe base64 to Uint8Array", () => {
    const base64 = "test-key-123";
    const result = urlBase64ToUint8Array(base64);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should convert ArrayBuffer to base64", () => {
    const buffer = new Uint8Array([72, 101, 108, 108, 111]).buffer;
    const result = arrayBufferToBase64(buffer);

    expect(typeof result).toBe("string");
    expect(result).toBeTruthy();
  });

  it("should handle null ArrayBuffer", () => {
    const result = arrayBufferToBase64(null);

    expect(result).toBe("");
  });
});

// Helper functions (duplicated from hook for testing)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
