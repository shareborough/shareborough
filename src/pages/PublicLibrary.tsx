import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ayb } from "../lib/ayb";
import { friendlyError, isNetworkError } from "../lib/errorMessages";
import { useToast } from "../hooks/useToast";
import type { Library, Item, FacetDefinition, ItemFacet, Loan } from "../types";
import Skeleton from "../components/Skeleton";
import ResponsiveImage from "../components/ResponsiveImage";
import Footer from "../components/Footer";

export default function PublicLibrary() {
  const { slug } = useParams<{ slug: string }>();
  const [library, setLibrary] = useState<Library | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [facetDefs, setFacetDefs] = useState<FacetDefinition[]>([]);
  const [facetValues, setFacetValues] = useState<ItemFacet[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Map<string, string>>(new Map());
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    loadLibrary();
  }, [slug]);

  async function loadLibrary() {
    if (!slug) return;
    try {
      const libRes = await ayb.records.list<Library>("libraries", {
        filter: `slug='${slug}'`,
        perPage: 1,
      });
      if (libRes.items.length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const lib = libRes.items[0];
      setLibrary(lib);

      const [itemRes, facetDefRes, facetValRes, loanRes] = await Promise.all([
        ayb.records.list<Item>("items", {
          filter: `library_id='${lib.id}'`,
          sort: "-created_at",
          perPage: 500,
        }),
        ayb.records.list<FacetDefinition>("facet_definitions", {
          filter: `library_id='${lib.id}'`,
          sort: "+position",
          perPage: 50,
        }),
        ayb.records.list<ItemFacet>("item_facets", { perPage: 5000, skipTotal: true }),
        ayb.records.list<Loan>("loans", {
          filter: "status='active' OR status='late'",
          perPage: 200,
        }),
      ]);
      setItems(itemRes.items);
      setFacetDefs(facetDefRes.items);
      setFacetValues(facetValRes.items);
      setLoans(loanRes.items);
    } catch (err) {
      if (isNetworkError(err)) {
        setLoadError(true);
        const { message } = friendlyError(err);
        toast.showError("Couldn't load library", message);
      } else {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  }

  function toggleFilter(defId: string, value: string) {
    setActiveFilters((prev) => {
      const next = new Map(prev);
      if (next.get(defId) === value) {
        next.delete(defId);
      } else {
        next.set(defId, value);
      }
      return next;
    });
  }

  function getItemFacets(itemId: string) {
    return facetValues.filter((fv) => fv.item_id === itemId);
  }

  function getFacetName(defId: string) {
    return facetDefs.find((fd) => fd.id === defId)?.name ?? "";
  }

  function getActiveLoan(itemId: string) {
    return loans.find((l) => l.item_id === itemId) ?? null;
  }

  // Build unique values per facet for filter chips
  const facetOptions = new Map<string, Set<string>>();
  for (const fv of facetValues) {
    if (!facetOptions.has(fv.facet_definition_id)) {
      facetOptions.set(fv.facet_definition_id, new Set());
    }
    facetOptions.get(fv.facet_definition_id)!.add(fv.value);
  }

  // Filter items
  const filtered = items.filter((item) => {
    // Search filter
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    // Facet filters
    for (const [defId, filterVal] of activeFilters) {
      const itemFacet = facetValues.find(
        (fv) => fv.item_id === item.id && fv.facet_definition_id === defId,
      );
      if (!itemFacet || itemFacet.value !== filterVal) {
        return false;
      }
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-50" aria-label="Loading library">
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="max-w-5xl mx-auto">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="max-w-5xl mx-auto p-4 sm:p-6">
          <Skeleton className="h-10 w-full sm:max-w-sm mb-6 rounded-lg" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card overflow-hidden">
                <Skeleton className="aspect-square w-full rounded-none" />
                <div className="p-3 flex flex-col gap-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loadError && !library) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-3xl mb-3 text-red-400">!</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to load library</h1>
        <p className="text-gray-500 mb-6">The server might be down or your internet connection may be interrupted.</p>
        <button onClick={loadLibrary} className="btn-primary">Try Again</button>
      </div>
    );
  }

  if (notFound || !library) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-5xl mb-4">📚</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Library not found</h1>
        <p className="text-gray-500 mb-6">This library doesn't exist or is private.</p>
        <Link to="/" className="btn-primary">Go Home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">📚</span>
            <span className="text-sm text-gray-400">Shareborough</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{library.name}</h1>
          {library.description && (
            <p className="text-gray-500 mt-1">{library.description}</p>
          )}
          <p className="text-sm text-gray-400 mt-2">
            {items.length} item{items.length !== 1 ? "s" : ""} available to borrow
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 flex-1">
        {/* Search & Filters */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full sm:max-w-sm"
          />

          {/* Facet filter chips */}
          {facetDefs.map((fd) => {
            const opts = facetOptions.get(fd.id);
            if (!opts || opts.size === 0) return null;
            return (
              <div key={fd.id} className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-sm text-gray-500">{fd.name}:</span>
                {[...opts].sort().map((val) => (
                  <button
                    key={val}
                    onClick={() => toggleFilter(fd.id, val)}
                    className={`badge cursor-pointer transition-colors ${
                      activeFilters.get(fd.id) === val
                        ? "bg-sage-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {val}
                  </button>
                ))}
                {activeFilters.has(fd.id) && (
                  <button
                    onClick={() => toggleFilter(fd.id, activeFilters.get(fd.id)!)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    clear
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Items Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {search || activeFilters.size > 0
              ? "No items match your filters"
              : "This library is empty"}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((item) => {
              const itemFacets = getItemFacets(item.id);
              const loan = getActiveLoan(item.id);
              return (
                <Link
                  key={item.id}
                  to={`/l/${slug}/${item.id}`}
                  className="card overflow-hidden hover:shadow-md transition-shadow group"
                >
                  {item.photo_url ? (
                    <div className="aspect-square bg-gray-100 overflow-hidden">
                      <ResponsiveImage
                        src={item.photo_url}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-gray-100 flex items-center justify-center">
                      <span className="text-4xl text-gray-300">📦</span>
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="font-medium text-gray-900 text-sm truncate">
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className={
                          item.status === "available"
                            ? "w-2 h-2 rounded-full bg-green-500"
                            : item.status === "borrowed"
                              ? "w-2 h-2 rounded-full bg-amber-500"
                              : "w-2 h-2 rounded-full bg-gray-400"
                        }
                      />
                      <span className="text-xs text-gray-500 capitalize">
                        {item.status}
                      </span>
                      {item.max_borrow_days && (
                        <span className="text-xs text-gray-400 ml-1">
                          ({item.max_borrow_days}d max)
                        </span>
                      )}
                    </div>
                    {/* Loan info for checked-out items */}
                    {loan && (
                      <p className="text-xs text-amber-600 mt-1">
                        {loan.return_by && (
                          <>Due {new Date(loan.return_by).toLocaleDateString()}</>
                        )}
                      </p>
                    )}
                    {itemFacets.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {itemFacets.slice(0, 2).map((fv) => (
                          <span
                            key={fv.id}
                            className="text-xs bg-gray-100 text-gray-500 rounded px-1 py-0.5"
                          >
                            {getFacetName(fv.facet_definition_id)}: {fv.value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
