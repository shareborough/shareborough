import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

interface CollapsibleSectionProps {
  title: string;
  count: number;
  badgeClass?: string;
  maxItems: number;
  totalItems: number;
  viewAllLink?: string;
  onExpand?: () => void;
  persistKey?: string;
  children: ReactNode[];
  className?: string;
}

export default function CollapsibleSection({
  title,
  count,
  badgeClass = "badge bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
  maxItems,
  totalItems,
  viewAllLink,
  onExpand,
  persistKey,
  children,
  className = "",
}: CollapsibleSectionProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (!persistKey) return false;
    return localStorage.getItem(`section-collapsed-${persistKey}`) === "true";
  });
  const [showAll, setShowAll] = useState(false);

  if (totalItems === 0) return null;

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    if (persistKey) {
      localStorage.setItem(`section-collapsed-${persistKey}`, String(next));
    }
  }

  const visibleChildren = showAll ? children : children.slice(0, maxItems);
  const hasMore = totalItems > maxItems && !showAll;

  return (
    <section className={`mb-6 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors min-h-[44px] -ml-1 pl-1"
          aria-expanded={!collapsed}
          aria-label={`${collapsed ? "Expand" : "Collapse"} ${title}`}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {title}
          <span className={`text-xs px-2 py-0.5 rounded-full ${badgeClass}`}>{count}</span>
        </button>

        {hasMore && !collapsed && (
          viewAllLink ? (
            <Link
              to={viewAllLink}
              className="text-xs text-sage-600 dark:text-sage-400 hover:underline shrink-0"
            >
              View all {totalItems} &rarr;
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowAll(true);
                onExpand?.();
              }}
              className="text-xs text-sage-600 dark:text-sage-400 hover:underline shrink-0"
            >
              Show all {totalItems}
            </button>
          )
        )}
      </div>

      {!collapsed && (
        <div className="flex flex-col gap-2">
          {visibleChildren}
        </div>
      )}
    </section>
  );
}
