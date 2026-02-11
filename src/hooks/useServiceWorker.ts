import { useEffect, useState } from "react";

/**
 * Hook to manage service worker lifecycle
 * Returns update availability and a function to apply updates
 */
export function useServiceWorker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const handleUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<ServiceWorkerRegistration>;
      setRegistration(customEvent.detail);
      setUpdateAvailable(true);
    };

    window.addEventListener("sw-update", handleUpdate);

    return () => {
      window.removeEventListener("sw-update", handleUpdate);
    };
  }, []);

  const applyUpdate = () => {
    if (registration && registration.waiting) {
      // Tell the service worker to skip waiting
      registration.waiting.postMessage({ type: "SKIP_WAITING" });

      // Reload the page when the new service worker activates
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      });
    }
  };

  return {
    updateAvailable,
    applyUpdate,
  };
}
