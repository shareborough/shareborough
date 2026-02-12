import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ayb, isLoggedIn } from "../lib/ayb";
import { rpc } from "../lib/rpc";
import { friendlyError } from "../lib/errorMessages";
import { useToast } from "../hooks/useToast";
import { useRealtime, type RealtimeEvent } from "../hooks/useRealtime";
import type { Library, Loan, Item, Borrower } from "../types";
import CreateLibrary from "../components/CreateLibrary";
import ConfirmDialog from "../components/ConfirmDialog";
import Skeleton from "../components/Skeleton";
import Footer from "../components/Footer";

export default function Dashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const [libraries, setLibraries] = useState<Library[]>([]);
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
      const [libRes, loanRes, allLoanRes, itemRes] = await Promise.all([
        ayb.records.list<Library>("libraries", { sort: "-created_at", perPage: 100 }),
        ayb.records.list<Loan>("loans", {
          filter: "status='active' OR status='late'",
          sort: "-created_at",
          perPage: 100,
        }),
        ayb.records.list<Loan>("loans", { perPage: 500, skipTotal: true }),
        ayb.records.list<Item>("items", { perPage: 500, skipTotal: true }),
      ]);
      setLibraries(libRes.items);
      setLoans(loanRes.items);
      setAllLoans(allLoanRes.items);
      setItems(itemRes.items);

      // Load borrowers for all loans
      const borrowerIds = new Set<string>();
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

  useRealtime(["loans", "items"], handleRealtime);

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
            <p className="text-3xl mb-3 text-red-400 dark:text-red-500">!</p>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Unable to load your data</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
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
        {loans.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              Currently Borrowed
              <span className="badge-borrowed">{loans.length}</span>
            </h2>
            <div className="flex flex-col gap-2">
              {loans.map((loan) => {
                const overdue = isOverdue(loan);
                const days = daysUntilDue(loan);
                return (
                  <div key={loan.id} className={`card p-3 sm:p-4 ${overdue ? "border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/20" : ""}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                      <div className="min-w-0">
                        <span className="font-medium">{getItemName(loan.item_id)}</span>
                        <span className="text-gray-400 dark:text-gray-500 mx-2">&rarr;</span>
                        <span className="text-gray-600 dark:text-gray-300">{getBorrowerName(loan.borrower_id)}</span>
                        {days !== null && (
                          <span className={`text-sm ml-2 ${overdue ? "text-red-600 font-medium" : "text-gray-400 dark:text-gray-500"}`}>
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
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">My Libraries</h2>
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
              <p className="text-3xl mb-3">&#x1F4DA;</p>
              <p className="text-gray-500 dark:text-gray-400 mb-4">No libraries yet. Create one to start lending!</p>
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
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-sage-700 dark:group-hover:text-sage-400">
                      {lib.name}
                    </h3>
                    {lib.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {lib.description}
                      </p>
                    )}
                  </div>
                  <span className="text-sm text-gray-400 dark:text-gray-500 shrink-0 ml-2">
                    {itemCountByLibrary.get(lib.id) ?? 0} items
                  </span>
                </div>
                {((lentCountByLibrary.get(lib.id) ?? 0) > 0 || (friendsByLibrary.get(lib.id)?.size ?? 0) > 0) && (
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
                    {(lentCountByLibrary.get(lib.id) ?? 0) > 0 && (
                      <span data-testid="stat-lent">{lentCountByLibrary.get(lib.id)} lent</span>
                    )}
                    {(friendsByLibrary.get(lib.id)?.size ?? 0) > 0 && (
                      <span data-testid="stat-friends">{friendsByLibrary.get(lib.id)!.size} friend{friendsByLibrary.get(lib.id)!.size !== 1 ? "s" : ""} helped</span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    shareborough.app/l/{lib.slug}
                  </span>
                  {lib.is_public && <span className="badge bg-sage-50 dark:bg-sage-900/30 text-sage-700 dark:text-sage-400 text-xs">Public</span>}
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
