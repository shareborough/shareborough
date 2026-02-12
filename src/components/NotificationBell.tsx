import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ayb } from "../lib/ayb";
import { useRealtime, type RealtimeEvent } from "../hooks/useRealtime";
import type { BorrowRequest, Loan } from "../types";

interface Notification {
  id: string;
  type: "request" | "overdue";
  title: string;
  subtitle: string;
  link: string;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [overdueLoans, setOverdueLoans] = useState<Loan[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      const [reqRes, loanRes] = await Promise.all([
        ayb.records.list<BorrowRequest>("borrow_requests", {
          filter: "status='pending'",
          sort: "-created_at",
          perPage: 50,
        }),
        ayb.records.list<Loan>("loans", {
          filter: "status='late'",
          sort: "-created_at",
          perPage: 50,
        }),
      ]);
      setRequests(reqRes.items);
      setOverdueLoans(loanRes.items);
    } catch {
      // Silently fail — navbar shouldn't block on notification errors
    }
  }

  const handleRealtime = useCallback((event: RealtimeEvent) => {
    if (event.table === "borrow_requests") {
      const req = event.record as unknown as BorrowRequest;
      if (event.action === "create" && req.status === "pending") {
        setRequests((prev) =>
          prev.find((r) => r.id === req.id) ? prev : [req, ...prev],
        );
      } else if (event.action === "update") {
        if (req.status !== "pending") {
          setRequests((prev) => prev.filter((r) => r.id !== req.id));
        }
      }
    }
    if (event.table === "loans") {
      const loan = event.record as unknown as Loan;
      if (event.action === "update") {
        if (loan.status === "late") {
          setOverdueLoans((prev) =>
            prev.find((l) => l.id === loan.id) ? prev : [loan, ...prev],
          );
        } else {
          setOverdueLoans((prev) => prev.filter((l) => l.id !== loan.id));
        }
      }
    }
  }, []);

  useRealtime(["borrow_requests", "loans"], handleRealtime);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const notifications: Notification[] = [
    ...requests.map((r) => ({
      id: r.id,
      type: "request" as const,
      title: "Borrow request",
      subtitle: r.message ? `"${r.message.slice(0, 60)}"` : "New borrow request",
      link: "/dashboard",
    })),
    ...overdueLoans.map((l) => ({
      id: l.id,
      type: "overdue" as const,
      title: "Overdue return",
      subtitle: `Due ${new Date(l.return_by!).toLocaleDateString()}`,
      link: "/dashboard",
    })),
  ];

  const count = notifications.length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex items-center justify-center px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-h-[44px] min-w-[44px]"
        aria-label={`Notifications${count > 0 ? ` (${count})` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gray-600 dark:text-gray-300">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 sm:w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</span>
            {count > 0 && <span className="badge-pending text-[10px]">{count}</span>}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
              All caught up!
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <Link
                  key={n.id}
                  to="/dashboard/notifications"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                >
                  <div className="flex items-start gap-2.5">
                    <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${n.type === "request" ? "bg-blue-500" : "bg-red-500"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{n.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{n.subtitle}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {notifications.length > 0 && (
            <Link
              to="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-center text-xs text-sage-600 dark:text-sage-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-t border-gray-100 dark:border-gray-700"
            >
              View all notifications
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
