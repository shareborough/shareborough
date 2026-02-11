import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ayb, isLoggedIn } from "../lib/ayb";
import { rpc } from "../lib/rpc";
import { friendlyError } from "../lib/errorMessages";
import { useToast } from "../hooks/useToast";
import { scheduleReminders } from "../lib/reminders";
import { useRealtime, type RealtimeEvent } from "../hooks/useRealtime";
import type { Library, BorrowRequest, Loan, Item, Borrower } from "../types";
import CreateLibrary from "../components/CreateLibrary";
import ConfirmDialog from "../components/ConfirmDialog";
import Skeleton from "../components/Skeleton";
import Footer from "../components/Footer";

export default function Dashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [allLoans, setAllLoans] = useState<Loan[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [borrowers, setBorrowers] = useState<Map<string, Borrower>>(new Map());
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
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
    setLoadError(false);
    try {
      const [libRes, reqRes, loanRes, allLoanRes, itemRes] = await Promise.all([
        ayb.records.list<Library>("libraries", { sort: "-created_at", perPage: 100 }),
        ayb.records.list<BorrowRequest>("borrow_requests", {
          filter: "status='pending'",
          sort: "-created_at",
          perPage: 100,
        }),
        ayb.records.list<Loan>("loans", {
          filter: "status='active' OR status='late'",
          sort: "-created_at",
          perPage: 100,
        }),
        ayb.records.list<Loan>("loans", { perPage: 500, skipTotal: true }),
        ayb.records.list<Item>("items", { perPage: 500, skipTotal: true }),
      ]);
      setLibraries(libRes.items);
      setRequests(reqRes.items);
      setLoans(loanRes.items);
      setAllLoans(allLoanRes.items);
      setItems(itemRes.items);

      // Load borrowers for all loans and requests
      const borrowerIds = new Set<string>();
      reqRes.items.forEach((r) => borrowerIds.add(r.borrower_id));
      allLoanRes.items.forEach((l) => borrowerIds.add(l.borrower_id));
      if (borrowerIds.size > 0) {
        const filter = [...borrowerIds].map((id) => `id='${id}'`).join(" OR ");
        const borRes = await ayb.records.list<Borrower>("borrowers", {
          filter,
          perPage: 500,
        });
        const bMap = new Map<string, Borrower>();
        borRes.items.forEach((b) => bMap.set(b.id, b));
        setBorrowers(bMap);
      }
    } catch (err) {
      setLoadError(true);
      const { message } = friendlyError(err);
      toast.showError("Couldn't load dashboard", message);
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
    if (event.table === "items") {
      const item = event.record as unknown as Item;
      if (event.action === "update") {
        setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
      }
    }
  }, []);

  useRealtime(["borrow_requests", "loans", "items"], handleRealtime);

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
      toast.showSuccess("Request approved", "The borrower will be notified.");
      loadAll();
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
          await ayb.records.update("borrow_requests", requestId, {
            status: "declined",
          });
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
          loadAll();
        } catch (err) {
          const { message } = friendlyError(err);
          toast.showError("Couldn't mark as returned", message);
        }
      },
    });
  }

  function handleLibraryCreated(lib: Library) {
    setLibraries((prev) => [lib, ...prev]);
    setShowCreate(false);
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
      <main className="max-w-4xl mx-auto p-4 sm:p-6" aria-label="Loading dashboard">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Skeleton.Card key={i} />
          ))}
        </div>
      </main>
    );
  }

  if (loadError && libraries.length === 0) {
    return (
      <>
        <main className="max-w-4xl mx-auto p-4 sm:p-6">
          <div className="card p-12 text-center">
            <p className="text-3xl mb-3 text-red-400">!</p>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Unable to load your data</h2>
            <p className="text-gray-500 mb-4">
              The server might be down or your internet connection may be interrupted.
            </p>
            <button onClick={loadAll} className="btn-primary">
              Try Again
            </button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const itemCountByLibrary = new Map<string, number>();
  items.forEach((item) => {
    itemCountByLibrary.set(
      item.library_id,
      (itemCountByLibrary.get(item.library_id) ?? 0) + 1,
    );
  });

  // Compute per-library stats: items lent + unique friends helped
  const itemToLibrary = new Map<string, string>();
  items.forEach((item) => itemToLibrary.set(item.id, item.library_id));

  const lentCountByLibrary = new Map<string, number>();
  const friendsByLibrary = new Map<string, Set<string>>();
  allLoans.forEach((loan) => {
    const libId = itemToLibrary.get(loan.item_id);
    if (!libId) return;
    lentCountByLibrary.set(libId, (lentCountByLibrary.get(libId) ?? 0) + 1);
    if (!friendsByLibrary.has(libId)) friendsByLibrary.set(libId, new Set());
    friendsByLibrary.get(libId)!.add(loan.borrower_id);
  });

  return (
    <>
      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        {requests.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">
              Pending Requests
              <span className="badge-pending ml-2">{requests.length}</span>
            </h2>
            <div className="flex flex-col gap-2">
              {requests.map((req) => (
                <div key={req.id} className="card p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                    <div className="min-w-0">
                      <span className="font-medium">{getBorrowerName(req.borrower_id)}</span>{" "}
                      wants to borrow{" "}
                      <span className="font-medium">{getItemName(req.item_id)}</span>
                      {req.return_by && (
                        <span className="text-sm text-gray-400 ml-2">
                          until {new Date(req.return_by).toLocaleDateString()}
                        </span>
                      )}
                      {req.message && (
                        <p className="text-sm text-gray-500 mt-1">"{req.message}"</p>
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
            </div>
          </section>
        )}

        {loans.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">
              Currently Borrowed
              <span className="badge-borrowed ml-2">{loans.length}</span>
            </h2>
            <div className="flex flex-col gap-2">
              {loans.map((loan) => {
                const overdue = isOverdue(loan);
                const days = daysUntilDue(loan);
                return (
                  <div key={loan.id} className={`card p-3 sm:p-4 ${overdue ? "border-red-200 bg-red-50/30" : ""}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                      <div className="min-w-0">
                        <span className="font-medium">{getItemName(loan.item_id)}</span>
                        <span className="text-gray-400 mx-2">&rarr;</span>
                        <span className="text-gray-600">{getBorrowerName(loan.borrower_id)}</span>
                        {days !== null && (
                          <span className={`text-sm ml-2 ${overdue ? "text-red-600 font-medium" : "text-gray-400"}`}>
                            {overdue
                              ? `${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} overdue`
                              : days === 0
                                ? "Due today"
                                : `Due in ${days} day${days !== 1 ? "s" : ""}`}
                          </span>
                        )}
                        {overdue && <span className="badge-late ml-2">Late</span>}
                      </div>
                      <button onClick={() => handleReturn(loan.id)} className="btn-secondary text-xs px-3 py-2 min-h-[40px] shrink-0 self-start sm:self-auto">
                        Mark Returned
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">My Libraries</h2>
            <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-sm">
              {showCreate ? "Cancel" : "+ New Library"}
            </button>
          </div>

          {showCreate && (
            <div className="mb-4">
              <CreateLibrary onCreated={handleLibraryCreated} />
            </div>
          )}

          {libraries.length === 0 && !showCreate && (
            <div className="card p-12 text-center">
              <p className="text-3xl mb-3">📚</p>
              <p className="text-gray-500 mb-4">No libraries yet. Create one to start lending!</p>
              <button onClick={() => setShowCreate(true)} className="btn-primary">
                Create Your First Library
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {libraries.map((lib) => (
              <Link key={lib.id} to={`/dashboard/library/${lib.id}`} className="card p-5 hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-sage-700">
                      {lib.name}
                    </h3>
                    {lib.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {lib.description}
                      </p>
                    )}
                  </div>
                  <span className="text-sm text-gray-400 shrink-0 ml-2">
                    {itemCountByLibrary.get(lib.id) ?? 0} items
                  </span>
                </div>
                {((lentCountByLibrary.get(lib.id) ?? 0) > 0 || (friendsByLibrary.get(lib.id)?.size ?? 0) > 0) && (
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    {(lentCountByLibrary.get(lib.id) ?? 0) > 0 && (
                      <span data-testid="stat-lent">{lentCountByLibrary.get(lib.id)} lent</span>
                    )}
                    {(friendsByLibrary.get(lib.id)?.size ?? 0) > 0 && (
                      <span data-testid="stat-friends">{friendsByLibrary.get(lib.id)!.size} friend{friendsByLibrary.get(lib.id)!.size !== 1 ? "s" : ""} helped</span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-gray-400">
                    shareborough.app/l/{lib.slug}
                  </span>
                  {lib.is_public && <span className="badge bg-sage-50 text-sage-700 text-xs">Public</span>}
                </div>
              </Link>
            ))}
          </div>
        </section>
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
