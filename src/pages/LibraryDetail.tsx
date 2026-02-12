import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ayb, isLoggedIn } from "../lib/ayb";
import { friendlyError } from "../lib/errorMessages";
import { useToast } from "../hooks/useToast";
import type { Library, Item, FacetDefinition, ItemFacet, Loan, Borrower, Circle } from "../types";
import AddFacet from "../components/AddFacet";
import ConfirmDialog from "../components/ConfirmDialog";
import Skeleton from "../components/Skeleton";
import ResponsiveImage from "../components/ResponsiveImage";
import Footer from "../components/Footer";

export default function LibraryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [library, setLibrary] = useState<Library | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [facetDefs, setFacetDefs] = useState<FacetDefinition[]>([]);
  const [facetValues, setFacetValues] = useState<ItemFacet[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [borrowers, setBorrowers] = useState<Map<string, Borrower>>(new Map());
  const [circles, setCircles] = useState<Circle[]>([]);
  const [showAddFacet, setShowAddFacet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dialog, setDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: "", message: "", onConfirm: () => {} });

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    loadLibrary();
  }, [id, navigate]);

  async function loadLibrary() {
    if (!id) return;
    setLoadError(false);
    try {
      const [lib, itemRes, facetRes, facetValRes, loanRes, circleRes] = await Promise.all([
        ayb.records.get<Library>("libraries", id),
        ayb.records.list<Item>("items", {
          filter: `library_id='${id}'`,
          sort: "-created_at",
          perPage: 200,
        }),
        ayb.records.list<FacetDefinition>("facet_definitions", {
          filter: `library_id='${id}'`,
          sort: "+position",
          perPage: 50,
        }),
        ayb.records.list<ItemFacet>("item_facets", { perPage: 5000, skipTotal: true }),
        ayb.records.list<Loan>("loans", {
          filter: "status='active' OR status='late'",
          perPage: 200,
        }),
        ayb.records.list<Circle>("circles", { perPage: 100 }),
      ]);
      setLibrary(lib);
      setItems(itemRes.items);
      setFacetDefs(facetRes.items);
      setFacetValues(facetValRes.items);
      setLoans(loanRes.items);
      setCircles(circleRes.items);

      const borrowerIds = new Set(loanRes.items.map((l) => l.borrower_id));
      if (borrowerIds.size > 0) {
        const filter = [...borrowerIds].map((bid) => `id='${bid}'`).join(" OR ");
        const borRes = await ayb.records.list<Borrower>("borrowers", { filter, perPage: 500 });
        const bMap = new Map<string, Borrower>();
        borRes.items.forEach((b) => bMap.set(b.id, b));
        setBorrowers(bMap);
      }
    } catch (err) {
      setLoadError(true);
      const { message } = friendlyError(err);
      toast.showError("Couldn't load library", message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteItem(itemId: string) {
    const item = items.find((i) => i.id === itemId);
    setDialog({
      open: true,
      title: "Delete Item",
      message: `Delete "${item?.name ?? "this item"}"? This cannot be undone.`,
      onConfirm: async () => {
        setDialog((d) => ({ ...d, open: false }));
        try {
          await ayb.records.delete("items", itemId);
          setItems((prev) => prev.filter((i) => i.id !== itemId));
          toast.showSuccess("Item deleted");
        } catch (err) {
          const { message } = friendlyError(err);
          toast.showError("Couldn't delete item", message);
        }
      },
    });
  }

  function copyShareLink() {
    if (!library) return;
    const url = `${window.location.origin}/l/${library.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function getItemFacets(itemId: string) {
    return facetValues.filter((fv) => fv.item_id === itemId);
  }

  function getFacetName(defId: string) {
    return facetDefs.find((fd) => fd.id === defId)?.name ?? "";
  }

  function getActiveLoan(itemId: string) {
    return loans.find((l) => l.item_id === itemId);
  }

  function getCircleName(circleId: string | null) {
    if (!circleId) return null;
    return circles.find((c) => c.id === circleId)?.name ?? null;
  }

  function handleFacetCreated(facet: FacetDefinition) {
    setFacetDefs((prev) => [...prev, facet]);
    setShowAddFacet(false);
  }

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto p-4 sm:p-6" aria-label="Loading library">
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card overflow-hidden">
              <Skeleton className="aspect-square w-full rounded-none" />
              <div className="p-4 flex flex-col gap-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (loadError && !library) {
    return (
      <>
        <main className="max-w-4xl mx-auto p-4 sm:p-6">
          <Link to="/dashboard" className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 mb-4 inline-block">
            &larr; My Libraries
          </Link>
          <div className="card p-12 text-center">
            <p className="text-3xl mb-3 text-red-400">!</p>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Unable to load library</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              The server might be down or your internet connection may be interrupted.
            </p>
            <button onClick={loadLibrary} className="btn-primary">
              Try Again
            </button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!library) {
    return <div className="flex items-center justify-center py-20 text-gray-400 dark:text-gray-500">Library not found</div>;
  }

  return (
    <>
      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="mb-6">
          <Link to="/dashboard" className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 mb-2 inline-block min-h-[44px] flex items-center">
            &larr; My Libraries
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{library.name}</h1>
              {library.description && (
                <p className="text-gray-500 dark:text-gray-400 mt-1">{library.description}</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={copyShareLink} className="btn-secondary text-sm min-h-[44px]">
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <Link to={`/dashboard/library/${id}/add`} className="btn-primary text-sm min-h-[44px] flex items-center">
                + Add Item
              </Link>
            </div>
          </div>
        </div>

        <div className="card p-3 mb-6 flex items-center justify-between bg-sage-50/50 dark:bg-sage-900/30">
          <div className="text-sm">
            <span className="text-gray-500 dark:text-gray-400">Share link: </span>
            <Link to={`/l/${library.slug}`} className="text-sage-700 dark:text-sage-400 font-medium hover:underline">
              {window.location.origin}/l/{library.slug}
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-sm text-gray-500 dark:text-gray-400">Facets:</span>
          {facetDefs.map((fd) => (
            <span key={fd.id} className="badge bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{fd.name}</span>
          ))}
          <button onClick={() => setShowAddFacet(!showAddFacet)} className="text-sm text-sage-600 hover:underline">
            + Add Facet
          </button>
        </div>

        {showAddFacet && (
          <div className="mb-4">
            <AddFacet libraryId={library.id} onCreated={handleFacetCreated} />
          </div>
        )}

        {items.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-3xl mb-3">\ud83d\udce6</p>
            <p className="text-gray-500 dark:text-gray-400 mb-4">No items yet. Start cataloging!</p>
            <Link to={`/dashboard/library/${id}/add`} className="btn-primary">
              Add Your First Item
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => {
              const activeLoan = getActiveLoan(item.id);
              const itemFacets = getItemFacets(item.id);
              const circleName = getCircleName(item.circle_id);
              return (
                <div key={item.id} className="card overflow-hidden group">
                  {item.photo_url ? (
                    <div className="aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <ResponsiveImage
                        src={item.photo_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-4xl text-gray-300 dark:text-gray-600">\ud83d\udce6</span>
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{item.name}</h3>
                      <span className={item.status === "available" ? "badge-available" : item.status === "borrowed" ? "badge-borrowed" : "badge bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}>
                        {item.status}
                      </span>
                    </div>
                    {item.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{item.description}</p>}
                    <div className="flex items-center gap-1.5 mt-1">
                      {item.visibility === "circle" && circleName ? (
                        <span className="badge bg-blue-50 text-blue-700 text-xs">{circleName}</span>
                      ) : (
                        <span className="badge bg-sage-50 dark:bg-sage-900/30 text-sage-700 dark:text-sage-400 text-xs">Public</span>
                      )}
                      {item.max_borrow_days && <span className="text-xs text-gray-400 dark:text-gray-500">Max {item.max_borrow_days}d</span>}
                    </div>
                    {itemFacets.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {itemFacets.map((fv) => (
                          <span key={fv.id} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded px-1.5 py-0.5">
                            {getFacetName(fv.facet_definition_id)}: {fv.value}
                          </span>
                        ))}
                      </div>
                    )}
                    {activeLoan && library.show_borrower_names && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                        Borrowed by {borrowers.get(activeLoan.borrower_id)?.name ?? "someone"}
                        {activeLoan.return_by && library.show_return_dates && (
                          <> — due {new Date(activeLoan.return_by).toLocaleDateString()}</>
                        )}
                      </p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="text-xs text-red-400 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity min-h-[32px] px-2 -ml-2"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />

      <ConfirmDialog
        open={dialog.open}
        title={dialog.title}
        message={dialog.message}
        variant="danger"
        confirmLabel="Delete"
        onConfirm={dialog.onConfirm}
        onCancel={() => setDialog((d) => ({ ...d, open: false }))}
      />
    </>
  );
}
