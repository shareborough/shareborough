import { useState, useEffect } from "react";
import { ayb } from "../lib/ayb";

export type PushPermission = "default" | "granted" | "denied";

interface PushSubscriptionState {
  permission: PushPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to manage push notification subscriptions
 * Handles permission requests, subscription, and unsubscription
 */
export function usePushNotifications() {
  const [state, setState] = useState<PushSubscriptionState>({
    permission: "default",
    isSubscribed: false,
    isLoading: true,
    error: null,
  });

  // Check initial permission and subscription state
  useEffect(() => {
    checkPermissionAndSubscription();
  }, []);

  const checkPermissionAndSubscription = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || typeof Notification === "undefined" || typeof navigator.serviceWorker === "undefined") {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Push notifications not supported",
      }));
      return;
    }

    const permission = Notification.permission as PushPermission;

    // Check if already subscribed
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    setState({
      permission,
      isSubscribed: !!subscription,
      isLoading: false,
      error: null,
    });
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!("Notification" in window) || typeof Notification === "undefined") {
      setState((prev) => ({ ...prev, error: "Notifications not supported" }));
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const permission = await Notification.requestPermission();

      setState((prev) => ({
        ...prev,
        permission: permission as PushPermission,
        isLoading: false,
      }));

      return permission === "granted";
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to request permission",
      }));
      return false;
    }
  };

  const subscribe = async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Request permission first if needed
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: "Notification permission denied",
        }));
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from backend
      const config = await ayb.records.list<{ public_key: string }>("push_config", {});
      const publicKey = config.items?.[0]?.public_key;

      if (!publicKey) {
        throw new Error("VAPID public key not configured");
      }

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey as string),
      });

      // Send subscription to backend
      await ayb.records.create("push_subscriptions", {
        endpoint: subscription.endpoint,
        keys: JSON.stringify({
          p256dh: arrayBufferToBase64(subscription.getKey("p256dh")),
          auth: arrayBufferToBase64(subscription.getKey("auth")),
        }),
      });

      setState((prev) => ({
        ...prev,
        isSubscribed: true,
        isLoading: false,
      }));

      return true;
    } catch (error) {
      console.error("Push subscription failed:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Subscription failed",
      }));
      return false;
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Delete from backend first
        const endpoint = subscription.endpoint;
        const subscriptions = await ayb.records.list("push_subscriptions", {
          filter: `endpoint='${endpoint}'`,
        });

        if (subscriptions.items && subscriptions.items.length > 0) {
          await ayb.records.delete(
            "push_subscriptions",
            subscriptions.items[0].id as string
          );
        }

        // Unsubscribe from push manager
        await subscription.unsubscribe();
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
      }));

      return true;
    } catch (error) {
      console.error("Push unsubscription failed:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Unsubscription failed",
      }));
      return false;
    }
  };

  return {
    ...state,
    subscribe,
    unsubscribe,
    requestPermission,
  };
}

// Helper functions
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
