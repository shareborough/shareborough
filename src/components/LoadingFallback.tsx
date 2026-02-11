import Skeleton from "./Skeleton";

interface LoadingFallbackProps {
  /** Route name for aria-label */
  route?: string;
  /** Layout variant - matches the expected page layout */
  variant?: "page" | "dashboard" | "form";
}

/**
 * Loading fallback for lazy-loaded routes
 * Shows shimmer skeleton matching the expected page layout
 */
export default function LoadingFallback({
  route = "page",
  variant = "page",
}: LoadingFallbackProps) {
  return (
    <div className="min-h-screen bg-warm-50" aria-label={`Loading ${route}`}>
      {/* Dashboard layout: grid of cards */}
      {variant === "dashboard" && (
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Skeleton className="h-10 w-64 mb-6" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      )}

      {/* Form layout: centered form */}
      {variant === "form" && (
        <div className="max-w-lg mx-auto px-4 py-8">
          <Skeleton className="h-10 w-48 mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-32" />
            <Skeleton className="h-12" />
          </div>
        </div>
      )}

      {/* Default page layout: generic content */}
      {variant === "page" && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-6 w-full mb-2" />
          <Skeleton className="h-6 w-3/4 mb-8" />
          <Skeleton className="h-64" />
        </div>
      )}
    </div>
  );
}
