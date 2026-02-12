import { FormEvent, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ayb, isLoggedIn } from "../lib/ayb";
import { processImage, createPreview } from "../lib/image";
import { friendlyError } from "../lib/errorMessages";
import { useToast } from "../hooks/useToast";
import type { FacetDefinition, Item, ItemFacet, Library } from "../types";
import ImageCropper from "../components/ImageCropper";
import Skeleton from "../components/Skeleton";
import Footer from "../components/Footer";

export default function EditItem() {
  const { id, itemId } = useParams<{ id: string; itemId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [library, setLibrary] = useState<Library | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [facetDefs, setFacetDefs] = useState<FacetDefinition[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxBorrowDays, setMaxBorrowDays] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [rawPreview, setRawPreview] = useState<string | null>(null);
  const [facetValues, setFacetValues] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    if (!id || !itemId) return;
    Promise.all([
      ayb.records.get<Library>("libraries", id),
      ayb.records.get<Item>("items", itemId),
      ayb.records.list<FacetDefinition>("facet_definitions", {
        filter: `library_id='${id}'`,
        sort: "+position",
        perPage: 50,
      }),
      ayb.records.list<ItemFacet>("item_facets", {
        filter: `item_id='${itemId}'`,
        perPage: 100,
      }),
    ]).then(([lib, existingItem, facets, existingFacets]) => {
      setLibrary(lib);
      setItem(existingItem);
      setFacetDefs(facets.items);
      setName(existingItem.name);
      setDescription(existingItem.description ?? "");
      setMaxBorrowDays(existingItem.max_borrow_days?.toString() ?? "");
      if (existingItem.photo_url) {
        // Resolve relative /api/ paths to absolute backend URLs
        const apiBase = import.meta.env.VITE_AYB_URL ?? "";
        const resolved = existingItem.photo_url.startsWith("/api/") && apiBase
          ? `${apiBase}${existingItem.photo_url}`
          : existingItem.photo_url;
        setPhotoPreview(resolved);
      }
      const fMap = new Map<string, string>();
      existingFacets.items.forEach((fv) => fMap.set(fv.facet_definition_id, fv.value));
      setFacetValues(fMap);
    }).catch((err) => {
      const { message } = friendlyError(err);
      toast.showError("Couldn't load item", message);
    }).finally(() => {
      setPageLoading(false);
    });
  }, [id, itemId, navigate]);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const processed = await processImage(file);
      const preview = await createPreview(processed);
      setRawPreview(preview);
      setShowCropper(true);
      setError("");
    } catch (err) {
      setError(friendlyError(err).message);
    }
  }

  function handleCrop(blob: Blob) {
    const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(blob));
    setShowCropper(false);
    setRawPreview(null);
  }

  function handleCropCancel() {
    if (rawPreview) {
      fetch(rawPreview)
        .then((r) => r.blob())
        .then((blob) => {
          const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
          setPhotoFile(file);
          setPhotoPreview(rawPreview);
        });
    }
    setShowCropper(false);
    setRawPreview(null);
  }

  function updateFacetValue(defId: string, value: string) {
    setFacetValues((prev) => {
      const next = new Map(prev);
      next.set(defId, value);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id || !itemId) return;
    setError("");
    setLoading(true);
    try {
      let photoUrl = item?.photo_url ?? null;
      if (photoFile) {
        const result = await ayb.storage.upload("item-photos", photoFile);
        photoUrl = `/api/storage/item-photos/${result.name}`;
      }

      await ayb.records.update("items", itemId, {
        name,
        description: description || null,
        photo_url: photoUrl,
        max_borrow_days: maxBorrowDays ? parseInt(maxBorrowDays, 10) : null,
      });

      // Update facet values (delete old, create new)
      const existingFacets = await ayb.records.list<ItemFacet>("item_facets", {
        filter: `item_id='${itemId}'`,
        perPage: 100,
      });
      for (const old of existingFacets.items) {
        await ayb.records.delete("item_facets", old.id);
      }
      for (const [defId, value] of facetValues) {
        if (value.trim()) {
          await ayb.records.create("item_facets", {
            item_id: itemId,
            facet_definition_id: defId,
            value: value.trim(),
          });
        }
      }

      toast.showSuccess("Item updated");
      navigate(`/dashboard/library/${id}`);
    } catch (err: unknown) {
      const { message } = friendlyError(err);
      setError(message);
      toast.showError("Couldn't update item", message);
    } finally {
      setLoading(false);
    }
  }

  if (pageLoading) {
    return (
      <main className="max-w-xl mx-auto p-4 sm:p-6" aria-label="Loading edit item form">
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="card p-6 flex flex-col gap-4">
          <Skeleton className="h-24 w-24 rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </main>
    );
  }

  if (!library || !item) {
    return <div className="flex items-center justify-center py-20 text-gray-400 dark:text-gray-500">Item not found</div>;
  }

  return (
    <>
      <main className="max-w-xl mx-auto p-4 sm:p-6">
        <Link
          to={`/dashboard/library/${id}`}
          className="text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 mb-4 inline-block"
        >
          &larr; Back to {library.name}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Edit Item</h1>

        <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-4">
          {/* Photo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Photo</label>

            {showCropper && rawPreview ? (
              <ImageCropper
                src={rawPreview}
                onCrop={handleCrop}
                onCancel={handleCropCancel}
              />
            ) : (
              <div className="flex items-center gap-4">
                {photoPreview ? (
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0">
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                    <span className="text-2xl text-gray-300 dark:text-gray-600">📷</span>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <label className="btn-secondary cursor-pointer inline-block text-sm flex-1 text-center">
                      <span>📸 Camera</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </label>
                    <label className="btn-secondary cursor-pointer inline-block text-sm flex-1 text-center">
                      <span>🖼️ Gallery</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">JPG, PNG, or HEIC</p>
                </div>
              </div>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input
              type="text"
              placeholder="What is this item?"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description <span className="text-gray-400 dark:text-gray-500">(optional)</span>
            </label>
            <textarea
              placeholder="Any details about this item..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input w-full resize-none"
              rows={3}
            />
          </div>

          {/* Max borrow period */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max borrow period <span className="text-gray-400 dark:text-gray-500">(days, optional)</span>
            </label>
            <input
              type="number"
              placeholder="e.g. 14"
              min="1"
              max="365"
              value={maxBorrowDays}
              onChange={(e) => setMaxBorrowDays(e.target.value)}
              className="input w-full"
            />
          </div>

          {/* Facet values */}
          {facetDefs.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Details</label>
              <div className="flex flex-col gap-2">
                {facetDefs.map((fd) => (
                  <div key={fd.id} className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 dark:text-gray-300 w-32 shrink-0">{fd.name}</label>
                    {fd.options && fd.options.length > 0 ? (
                      <select
                        value={facetValues.get(fd.id) ?? ""}
                        onChange={(e) => updateFacetValue(fd.id, e.target.value)}
                        className="input flex-1"
                      >
                        <option value="">Select...</option>
                        {fd.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : fd.facet_type === "boolean" ? (
                      <select
                        value={facetValues.get(fd.id) ?? ""}
                        onChange={(e) => updateFacetValue(fd.id, e.target.value)}
                        className="input flex-1"
                      >
                        <option value="">Select...</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    ) : (
                      <input
                        type={fd.facet_type === "number" ? "number" : "text"}
                        placeholder={fd.name}
                        value={facetValues.get(fd.id) ?? ""}
                        onChange={(e) => updateFacetValue(fd.id, e.target.value)}
                        className="input flex-1"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </main>

      <Footer />
    </>
  );
}
