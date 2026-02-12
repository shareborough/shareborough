import { FormEvent, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ayb, isLoggedIn } from "../lib/ayb";
import { processImage, createPreview } from "../lib/image";
import { friendlyError } from "../lib/errorMessages";
import { formatBarcodeResult } from "../lib/barcode";
import { useToast } from "../hooks/useToast";
import type { FacetDefinition, Item, Library, Circle } from "../types";
import BarcodeScanner from "../components/BarcodeScanner";
import ImageCropper from "../components/ImageCropper";
import Skeleton from "../components/Skeleton";
import Footer from "../components/Footer";

export default function AddItem() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [library, setLibrary] = useState<Library | null>(null);
  const [facetDefs, setFacetDefs] = useState<FacetDefinition[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxBorrowDays, setMaxBorrowDays] = useState("");
  const [visibility, setVisibility] = useState<"public" | "circle">("public");
  const [circleId, setCircleId] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [rawPreview, setRawPreview] = useState<string | null>(null);
  const [facetValues, setFacetValues] = useState<Map<string, string>>(new Map());
  const [showScanner, setShowScanner] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const toast = useToast();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    if (!id) return;
    Promise.all([
      ayb.records.get<Library>("libraries", id),
      ayb.records.list<FacetDefinition>("facet_definitions", {
        filter: `library_id='${id}'`,
        sort: "+position",
        perPage: 50,
      }),
      ayb.records.list<Circle>("circles", { perPage: 100 }),
    ]).then(([lib, facets, circleRes]) => {
      setLibrary(lib);
      setFacetDefs(facets.items);
      setCircles(circleRes.items);
    }).catch((err) => {
      const { message } = friendlyError(err);
      toast.showError("Couldn't load library data", message);
    });
  }, [id, navigate]);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // Process the image (resize, convert HEIC->JPEG, compress)
      const processed = await processImage(file);
      const preview = await createPreview(processed);
      // Show cropper with the processed image
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
    const url = URL.createObjectURL(blob);
    setPhotoPreview(url);
    setShowCropper(false);
    setRawPreview(null);
  }

  function handleCropCancel() {
    // Use the uncropped image as-is
    if (rawPreview) {
      // Convert data URL back to file
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

  async function handleBarcodeDetected(code: string, format: string) {
    setShowScanner(false);
    setScanLoading(true);
    try {
      const result = await formatBarcodeResult(code, format);
      if (result.name) {
        setName(result.name);
      }
      if (result.description) {
        setDescription((prev) => prev ? `${prev}\n${result.description}` : result.description);
      }
      toast.showSuccess(`Scanned: ${code}`);
    } catch {
      toast.showError("Couldn't look up barcode");
    } finally {
      setScanLoading(false);
    }
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
    if (!id) return;
    setError("");
    setLoading(true);
    try {
      // Upload photo if present
      let photoUrl: string | null = null;
      if (photoFile) {
        const result = await ayb.storage.upload("item-photos", photoFile);
        photoUrl = `/api/storage/item-photos/${result.name}`;
      }

      // Create item
      const item = await ayb.records.create<Item>("items", {
        library_id: id,
        name,
        description: description || null,
        photo_url: photoUrl,
        max_borrow_days: maxBorrowDays ? parseInt(maxBorrowDays, 10) : null,
        visibility,
        circle_id: visibility === "circle" && circleId ? circleId : null,
      });

      // Create facet values
      for (const [defId, value] of facetValues) {
        if (value.trim()) {
          await ayb.records.create("item_facets", {
            item_id: item.id,
            facet_definition_id: defId,
            value: value.trim(),
          });
        }
      }

      toast.showSuccess("Item added successfully");
      navigate(`/dashboard/library/${id}`);
    } catch (err: unknown) {
      const { message } = friendlyError(err);
      setError(message);
      toast.showError("Couldn't add item", message);
    } finally {
      setLoading(false);
    }
  }

  if (!library) {
    return (
      <main className="max-w-xl mx-auto p-4 sm:p-6" aria-label="Loading add item form">
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

  return (
    <>
      <main className="max-w-xl mx-auto p-4 sm:p-6">
        <Link
          to={`/dashboard/library/${id}`}
          className="text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 mb-4 inline-block"
        >
          &larr; Back to {library.name}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Add Item</h1>

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

          {/* Barcode Scanner */}
          <div>
            {showScanner ? (
              <BarcodeScanner
                onDetected={handleBarcodeDetected}
                onClose={() => setShowScanner(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                disabled={scanLoading}
                className="btn-secondary text-sm w-full"
              >
                {scanLoading ? "Looking up barcode..." : "📊 Scan Barcode (ISBN / UPC)"}
              </button>
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
              autoFocus
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

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Visibility</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as "public" | "circle")}
              className="input w-full"
            >
              <option value="public">Public — anyone with the link</option>
              <option value="circle">Circle — specific group only</option>
            </select>
            {visibility === "circle" && (
              <select
                value={circleId}
                onChange={(e) => setCircleId(e.target.value)}
                className="input w-full mt-2"
              >
                <option value="">Select a circle...</option>
                {circles.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
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
            {loading ? "Adding..." : "Add Item"}
          </button>
        </form>
      </main>

      <Footer />
    </>
  );
}
