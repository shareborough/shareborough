/**
 * Reusable skeleton shimmer placeholder for loading states.
 * Usage:
 *   <Skeleton className="h-4 w-32" />          — single line
 *   <Skeleton className="h-40 w-full" round />  — circle/avatar
 *   <Skeleton.Text lines={3} />                 — multi-line text block
 *   <Skeleton.Card />                           — card-shaped placeholder
 */

interface SkeletonProps {
  className?: string;
  round?: boolean;
}

export default function Skeleton({ className = "h-4 w-full", round }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton-shimmer bg-gray-200 ${round ? "rounded-full" : "rounded"} ${className}`}
    />
  );
}

function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`skeleton-shimmer bg-gray-200 rounded h-4 ${i === lines - 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}

function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`card p-6 ${className}`} aria-hidden="true">
      <div className="flex gap-4">
        <div className="skeleton-shimmer bg-gray-200 rounded-lg h-16 w-16 shrink-0" />
        <div className="flex-1 flex flex-col gap-2">
          <div className="skeleton-shimmer bg-gray-200 rounded h-5 w-2/3" />
          <div className="skeleton-shimmer bg-gray-200 rounded h-4 w-full" />
          <div className="skeleton-shimmer bg-gray-200 rounded h-4 w-1/2" />
        </div>
      </div>
    </div>
  );
}

Skeleton.Text = SkeletonText;
Skeleton.Card = SkeletonCard;
