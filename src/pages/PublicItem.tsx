import { FormEvent, useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ayb } from "../lib/ayb";
import { requestBorrow } from "../lib/borrow";
import { friendlyError } from "../lib/errorMessages";
import { useToast } from "../hooks/useToast";
import type { Library, Item, FacetDefinition, ItemFacet, Loan, Borrower } from "../types";
import Skeleton from "../components/Skeleton";
import ResponsiveImage from "../components/ResponsiveImage";
import Footer from "../components/Footer";

export default function PublicItem() {
  const { slug, itemId } = useParams<{ slug: string; itemId: string }>();
  const navigate = useNavigate();
  const [library, setLibrary] = useState<Library | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [facetDefs, setFacetDefs] = useState<FacetDefinition[]>([]);
  const [facetValues, setFacetValues] = useState<ItemFacet[]>([]);
  const [activeLoan, setActiveLoan] = useState<Loan | null>(null);
  const [borrowerName, setBorrowerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBorrow, setShowBorrow] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formReturnBy, setFormReturnBy] = useState("");
  const [formPrivate, setFormPrivate] = useState(false);
  const toast = useToast();
  const [borrowLoading, setBorrowLoading] = useState(false);
  const [borrowError, setBorrowError] = useState("");

  useEffect(() => {
    loadItem();
  }, [slug, itemId]);

  async function loadItem() {
    if (!slug || !itemId) return;
    try {
      const libRes = await ayb.records.list<Library>("libraries", {
        filter: `slug='${slug}'`,
        perPage: 1,
      });
      if (libRes.items.length === 0) {
        setLoading(false);
        return;
      }
      const lib = libRes.items[0];
      setLibrary(lib);

      const [itemData, facetDefRes, facetValRes] = await Promise.all([
        ayb.records.get<Item>("items", itemId),
        ayb.records.list<FacetDefinition>("facet_definitions", {
          filter: `library_id='${lib.id}'`,
          sort: "+position",
          perPage: 50,
        }),
        ayb.records.list<ItemFacet>("item_facets", {
          filter: `item_id='${itemId}'`,
          perPage: 50,
        }),
      ]);
      setItem(itemData);
      setFacetDefs(facetDefRes.items);
      setFacetValues(facetValRes.items);

      // Load active loan info for borrowed items
      if (itemData.status === "borrowed") {
        try {
          const loanRes = await ayb.records.list<Loan>("loans", {
            filter: `item_id='${itemId}' AND (status='active' OR status='late')`,
            perPage: 1,
          });
          if (loanRes.items.length > 0) {
            const loan = loanRes.items[0];
            setActiveLoan(loan);
            // Load borrower name if possession is not private
            if (!loan.private_possession) {
              try {
                const borRes = await ayb.records.list<Borrower>("borrowers", {
                  filter: `id='${loan.borrower_id}'`,
                  perPage: 1,
                });
                if (borRes.items.length > 0) {
                  setBorrowerName(borRes.items[0].name);
                }
              } catch { /* borrower info is optional */ }
            }
          }
        } catch { /* loan info is optional for public view */ }
      }

      // Set default return date based on max_borrow_days
      if (itemData.max_borrow_days) {
        const defaultReturn = new Date();
        defaultReturn.setDate(defaultReturn.getDate() + itemData.max_borrow_days);
        setFormReturnBy(defaultReturn.toISOString().split("T")[0]);
      }
    } catch (err) {
      const { message } = friendlyError(err);
      toast.showError("Couldn't load item", message);
    } finally {
      setLoading(false);
    }
  }

  function getFacetName(defId: string) {
    return facetDefs.find((fd) => fd.id === defId)?.name ?? "";
  }

  function getMaxReturnDate(): string | undefined {
    if (!item?.max_borrow_days) return undefined;
    const max = new Date();
    max.setDate(max.getDate() + item.max_borrow_days);
    return max.toISOString().split("T")[0];
  }

  function getMinReturnDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }

  async function handleBorrow(e: FormEvent) {
    e.preventDefault();
    if (!item) return;
    setBorrowError("");
    setBorrowLoading(true);
    try {
      const result = await requestBorrow({
        itemId: item.id,
        name: formName,
        phone: formPhone,
        message: formMessage || null,
        returnBy: formReturnBy ? new Date(formReturnBy).toISOString() : null,
        privatePossession: formPrivate,
      });
      navigate(`/borrow/${result.id}`);
    } catch (err: unknown) {
      setBorrowError(friendlyError(err).message);
    } finally {
      setBorrowLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-50" aria-label="Loading item">
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="max-w-3xl mx-auto p-4 sm:p-6">
          <div className="card overflow-hidden sm:flex">
            <div className="sm:w-1/2">
              <Skeleton className="aspect-square w-full rounded-none" />
            </div>
            <div className="sm:w-1/2 p-6 flex flex-col gap-3">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton.Text lines={3} />
              <Skeleton className="h-12 w-full rounded-lg mt-4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!library || !item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-5xl mb-4">📦</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Item not found</h1>
        <Link to={`/l/${slug}`} className="btn-primary mt-4">
          Back to Library
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col">
      {/* Compact header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <Link to={`/l/${slug}`} className="text-gray-400 hover:text-gray-600">
            &larr;
          </Link>
          <span className="text-sm text-gray-500">{library.name}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-6 flex-1">
        <div className="card overflow-hidden">
          <div className="sm:flex">
            {/* Photo */}
            <div className="sm:w-1/2">
              {item.photo_url ? (
                <div className="aspect-square bg-gray-100">
                  <ResponsiveImage
                    src={item.photo_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  <span className="text-6xl text-gray-300">📦</span>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="sm:w-1/2 p-6">
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
                <span
                  className={
                    item.status === "available"
                      ? "badge-available"
                      : item.status === "borrowed"
                        ? "badge-borrowed"
                        : "badge bg-gray-100 text-gray-500"
                  }
                >
                  {item.status}
                </span>
              </div>

              {item.description && (
                <p className="text-gray-600 mb-4 leading-relaxed">{item.description}</p>
              )}

              {/* Lending info */}
              {item.max_borrow_days && (
                <p className="text-sm text-gray-400 mb-2">
                  Max borrow period: {item.max_borrow_days} days
                </p>
              )}

              {/* Active loan info (public view) */}
              {activeLoan && (
                <div className="bg-amber-50 rounded-lg p-3 mb-4 text-sm">
                  <p className="text-amber-700">
                    Currently checked out
                    {borrowerName && !activeLoan.private_possession && (
                      <> to <span className="font-medium">{borrowerName}</span></>
                    )}
                    {activeLoan.return_by && (
                      <> — due back {new Date(activeLoan.return_by).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
              )}

              {/* Facet values */}
              {facetValues.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Details</h3>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {facetValues.map((fv) => (
                      <div key={fv.id} className="contents">
                        <dt className="text-sm text-gray-500">
                          {getFacetName(fv.facet_definition_id)}
                        </dt>
                        <dd className="text-sm text-gray-900 font-medium">{fv.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {/* Borrow button / form */}
              {item.status === "available" ? (
                showBorrow ? (
                  <form onSubmit={handleBorrow} className="flex flex-col gap-3">
                    <h3 className="font-semibold text-gray-900">Request to Borrow</h3>
                    <p className="text-sm text-gray-500">
                      Just your name and phone number — no account needed!
                    </p>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="input"
                      required
                      autoFocus
                    />
                    <input
                      type="tel"
                      placeholder="Phone number"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="input"
                      required
                    />
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Return by {item.max_borrow_days ? `(max ${item.max_borrow_days} days)` : "(optional)"}
                      </label>
                      <input
                        type="date"
                        value={formReturnBy}
                        onChange={(e) => setFormReturnBy(e.target.value)}
                        min={getMinReturnDate()}
                        max={getMaxReturnDate()}
                        className="input w-full"
                      />
                    </div>
                    <textarea
                      placeholder="Message to the owner (optional)"
                      value={formMessage}
                      onChange={(e) => setFormMessage(e.target.value)}
                      className="input resize-none"
                      rows={2}
                    />
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={formPrivate}
                        onChange={(e) => setFormPrivate(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      Keep my possession private
                    </label>
                    {borrowError && (
                      <p className="text-red-500 text-sm">{borrowError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={borrowLoading}
                        className="btn-primary flex-1"
                      >
                        {borrowLoading ? "Sending..." : "Send Request"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowBorrow(false)}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowBorrow(true)}
                    className="btn-primary w-full text-base py-3"
                  >
                    Borrow This
                  </button>
                )
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-gray-500">
                    This item is currently {item.status}. Check back later!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
