import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ayb, isLoggedIn, currentUserId } from "../lib/ayb";
import { rpc } from "../lib/rpc";
import { friendlyError } from "../lib/errorMessages";
import { useToast } from "../hooks/useToast";
import { scheduleReminders } from "../lib/reminders";
import { useRealtime, type RealtimeEvent } from "../hooks/useRealtime";
import type { Library, BorrowRequest, Loan, Item, Borrower } from "../types";
import CollapsibleSection from "../components/CollapsibleSection";
import ConfirmDialog from "../components/ConfirmDialog";
import Skeleton from "../components/Skeleton";
import Footer from "../components/Footer";

export default function Notifications() {
  const navigate = useNavigate();
  const toast = useToast();
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [borrowers, setBorrowers] = useState<Map<string, Borrower>>(new Map());
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "default" | "danger";
    confirmLabel: string;
    onConfirm: () => void;
  }>({ open: false, title: "", message: "", variant: "default", confirmLabel: "OK", onConfirm: () => {} });

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    loadAll();
  }, [navigate]);

  async function loadAll() {
    try {
      const userId = currentUserId();

      // Step 1: Load owned libraries. Without this, public_read RLS leaks other users' data.
      const libFilter = userId ? `owner_id='${userId}'` : undefined;
      const libRes = await ayb.records.list<Library>("libraries", {
        filter: libFilter,
        perPage: 100,
      });
      setLibraries(libRes.items);

      if (libRes.items.length === 0) {
        setItems([]);
        setRequests([]);
        setLoans([]);
        setLoading(false);
        return;
      }

      // Step 2: Load items server-side filtered to owned libraries.
      // Without this filter, items_public_read returns ALL public items which can
      // exceed perPage limits and push owned items out of the results.
      const libIdFilter = libRes.items.map((l) => `library_id='${l.id}'`).join(" OR ");
      const itemRes = await ayb.records.list<Item>("items", {
        filter: libIdFilter,
        perPage: 500,
        skipTotal: true,
      });
      setItems(itemRes.items);

      // Step 3: Load requests and loans filtered to owned items
      const itemIdFilter = itemRes.items.length > 0
        ? itemRes.items.map((i) => `item_id='${i.id}'`).join(" OR ")
        : undefined;

      const [reqRes, loanRes] = await Promise.all([
        itemIdFilter
          ? ayb.records.list<BorrowRequest>("borrow_requests", {
              filter: `(${itemIdFilter}) AND status='pending'`,
              sort: "-created_at",
              perPage: 100,
            })
          : Promise.resolve({ items: [] as BorrowRequest[] }),
        itemIdFilter
          ? ayb.records.list<Loan>("loans", {
              filter: `(${itemIdFilter}) AND (status='active' OR status='late')`,
              sort: "-created_at",
              perPage: 100,
            })
          : Promise.resolve({ items: [] as Loan[] }),
      ]);

      setRequests(reqRes.items);
      setLoans(loanRes.items);

      const borrowerIds = new Set<string>();
      reqRes.items.forEach((r) => borrowerIds.add(r.borrower_id));
      loanRes.items.forEach((l) => borrowerIds.add(l.borrower_id));
      if (borrowerIds.size > 0) {
        const filter = [...borrowerIds].map((id) => `id='${id}'`).join(" OR ");
        const borRes = await ayb.records.list<Borrower>("borrowers", { filter, perPage: 500 });
        const bMap = new Map<string, Borrower>();
        borRes.items.forEach((b) => bMap.set(b.id, b));
        setBorrowers(bMap);
      }
    } catch (err) {
      const { message } = friendlyError(err);
      toast.showError("Couldn't load notifications", message);
    } finally {
      setLoading(false);
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
      if (event.action === "create") {
        setLoans((prev) =>
          prev.find((l) => l.id === loan.id) ? prev : [loan, ...prev],
        );
      } else if (event.action === "update") {
        if (loan.status === "returned") {
          setLoans((prev) => prev.filter((l) => l.id !== loan.id));
        } else {
          setLoans((prev) => prev.map((l) => (l.id === loan.id ? loan : l)));
        }
      }
    }
  }, []);

  useRealtime(["borrow_requests", "loans"], handleRealtime);

  async function handleApprove(requestId: string) {
    const request = requests.find((r) => r.id === requestId);
    const returnDate = request?.return_by
      ? new Date(request.return_by)
      : new Date(Date.now() + 14 * 86400000);
    try {
      const loan = await rpc<Loan>("approve_borrow", {
        p_request_id: requestId,
        p_return_by: returnDate.toISOString(),
      });

      if (request && loan?.id) {
        const item = items.find((i) => i.id === request.item_id);
        const borrower = borrowers.get(request.borrower_id);
        const library = libraries.find((l) => l.id === item?.library_id);
        if (item && borrower) {
          scheduleReminders({
            loanId: loan.id,
            itemName: item.name,
            ownerName: library?.name ?? "your lender",
            borrowerName: borrower.name,
            returnBy: returnDate.toISOString(),
          }).catch(() => {});
        }
      }

      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      // Add the new loan to state so "Currently Borrowed" appears immediately
      if (loan) {
        setLoans((prev) => prev.find((l) => l.id === loan.id) ? prev : [loan, ...prev]);
      }
      toast.showSuccess("Request approved", "The borrower will be notified.");
    } catch (err) {
      const { message } = friendlyError(err);
      toast.showError("Couldn't approve request", message);
    }
  }

  async function handleDecline(requestId: string) {
    setDialog({
      open: true,
      title: "Decline Request",
      message: `Decline this borrow request from ${getBorrowerName(requests.find((r) => r.id === requestId)?.borrower_id ?? "")}?`,
      variant: "danger",
      confirmLabel: "Decline",
      onConfirm: async () => {
        setDialog((d) => ({ ...d, open: false }));
        try {
          await ayb.records.update("borrow_requests", requestId, { status: "declined" });
          setRequests((prev) => prev.filter((r) => r.id !== requestId));
          toast.showSuccess("Request declined");
        } catch (err) {
          const { message } = friendlyError(err);
          toast.showError("Couldn't decline request", message);
        }
      },
    });
  }

  async function handleReturn(loanId: string) {
    setDialog({
      open: true,
      title: "Mark as Returned",
      message: `Mark "${getItemName(loans.find((l) => l.id === loanId)?.item_id ?? "")}" as returned?`,
      variant: "default",
      confirmLabel: "Mark Returned",
      onConfirm: async () => {
        setDialog((d) => ({ ...d, open: false }));
        try {
          await rpc("return_item", { p_loan_id: loanId });
          setLoans((prev) => prev.filter((l) => l.id !== loanId));
          toast.showSuccess("Item marked as returned");
        } catch (err) {
          const { message } = friendlyError(err);
          toast.showError("Couldn't mark as returned", message);
        }
      },
    });
  }

  function getItemName(itemId: string) {
    return items.find((i) => i.id === itemId)?.name ?? "Unknown item";
  }

  function getBorrowerName(borrowerId: string) {
    return borrowers.get(borrowerId)?.name ?? "Unknown";
  }

  function isOverdue(loan: Loan) {
    if (!loan.return_by) return false;
    return new Date(loan.return_by) < new Date();
  }

  function daysUntilDue(loan: Loan) {
    if (!loan.return_by) return null;
    const diff = new Date(loan.return_by).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto p-4 sm:p-6" aria-label="Loading notifications">
        <Skeleton className="h-6 w-40 mb-6" />
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton.Card key={i} />
          ))}
        </div>
      </main>
    );
  }

  const overdueLoans = loans.filter((l) => isOverdue(l));
  const activeLoans = loans.filter((l) => !isOverdue(l));
  const hasNothing = requests.length === 0 && loans.length === 0;

  return (
    <>
      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        <Link
          to="/dashboard"
          className="text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 mb-4 inline-block min-h-[44px] flex items-center"
        >
          &larr; Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Notifications</h1>

        {hasNothing && (
          <div className="card p-12 text-center">
            <p className="text-3xl mb-3">&#x1F514;</p>
            <p className="text-gray-500 dark:text-gray-400">All caught up! No pending requests or overdue items.</p>
          </div>
        )}

        <CollapsibleSection
          title="Pending Requests"
          count={requests.length}
          badgeClass="badge-pending"
          maxItems={10}
          totalItems={requests.length}
          persistKey="notif-requests"
        >
              {requests.map((req) => (
                <div key={req.id} className="card p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                    <div className="min-w-0">
                      <span className="font-medium text-sm">{getBorrowerName(req.borrower_id)}</span>{" "}
                      <span className="text-sm text-gray-500 dark:text-gray-400">wants to borrow</span>{" "}
                      <span className="font-medium text-sm">{getItemName(req.item_id)}</span>
                      {req.return_by && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                          until {new Date(req.return_by).toLocaleDateString()}
                        </span>
                      )}
                      {req.message && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">"{req.message}"</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleApprove(req.id)} className="btn-primary text-xs px-3 py-2 min-h-[40px]">
                        Approve
                      </button>
                      <button onClick={() => handleDecline(req.id)} className="btn-danger text-xs px-3 py-2 min-h-[40px]">
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
        </CollapsibleSection>

        <CollapsibleSection
          title="Overdue"
          count={overdueLoans.length}
          badgeClass="badge-late"
          maxItems={10}
          totalItems={overdueLoans.length}
          persistKey="notif-overdue"
        >
              {overdueLoans.map((loan) => {
                const days = daysUntilDue(loan);
                return (
                  <div key={loan.id} className="card p-3 sm:p-4 border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/20">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                      <div className="min-w-0">
                        <span className="font-medium">{getItemName(loan.item_id)}</span>
                        <span className="text-gray-400 dark:text-gray-500 mx-2">&rarr;</span>
                        <span className="text-gray-600 dark:text-gray-300">{getBorrowerName(loan.borrower_id)}</span>
                        {days !== null && (
                          <span className="text-sm ml-2 text-red-600 font-medium">
                            {Math.abs(days)} day{Math.abs(days) !== 1 ? "s" : ""} overdue
                          </span>
                        )}
                      </div>
                      <button onClick={() => handleReturn(loan.id)} className="btn-secondary text-xs px-3 py-2 min-h-[40px] shrink-0 self-start sm:self-auto">
                        Mark Returned
                      </button>
                    </div>
                  </div>
                );
              })}
        </CollapsibleSection>

        <CollapsibleSection
          title="Currently Borrowed"
          count={activeLoans.length}
          badgeClass="badge-borrowed"
          maxItems={10}
          totalItems={activeLoans.length}
          persistKey="notif-active"
        >
              {activeLoans.map((loan) => {
                const days = daysUntilDue(loan);
                return (
                  <div key={loan.id} className="card p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                      <div className="min-w-0">
                        <span className="font-medium">{getItemName(loan.item_id)}</span>
                        <span className="text-gray-400 dark:text-gray-500 mx-2">&rarr;</span>
                        <span className="text-gray-600 dark:text-gray-300">{getBorrowerName(loan.borrower_id)}</span>
                        {days !== null && (
                          <span className={`text-sm ml-2 ${days === 0 ? "text-amber-600" : "text-gray-400 dark:text-gray-500"}`}>
                            {days === 0 ? "Due today" : `Due in ${days} day${days !== 1 ? "s" : ""}`}
                          </span>
                        )}
                      </div>
                      <button onClick={() => handleReturn(loan.id)} className="btn-secondary text-xs px-3 py-2 min-h-[40px] shrink-0 self-start sm:self-auto">
                        Mark Returned
                      </button>
                    </div>
                  </div>
                );
              })}
        </CollapsibleSection>
      </main>

      <Footer />

      <ConfirmDialog
        open={dialog.open}
        title={dialog.title}
        message={dialog.message}
        variant={dialog.variant}
        confirmLabel={dialog.confirmLabel}
        onConfirm={dialog.onConfirm}
        onCancel={() => setDialog((d) => ({ ...d, open: false }))}
      />
    </>
  );
}
