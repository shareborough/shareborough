import { useHealthCheck } from "../hooks/useHealthCheck";

export default function OfflineBanner() {
  const { status, retryIn, retryNow } = useHealthCheck();

  if (status !== "offline") return null;

  return (
    <div className="bg-red-600 text-white text-sm px-4 py-2.5 text-center sticky top-0 z-[70]">
      <span>
        Unable to reach the server. Your changes may not be saved.
      </span>
      <button
        onClick={retryNow}
        className="ml-3 underline font-medium hover:text-red-100"
      >
        {retryIn > 0 ? `Retry now (${retryIn}s)` : "Retry now"}
      </button>
    </div>
  );
}
