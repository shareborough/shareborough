import { FormEvent, useState } from "react";
import { ayb } from "../lib/ayb";
import { friendlyError } from "../lib/errorMessages";
import type { FacetDefinition } from "../types";

interface Props {
  libraryId: string;
  onCreated: (facet: FacetDefinition) => void;
}

export default function AddFacet({ libraryId, onCreated }: Props) {
  const [name, setName] = useState("");
  const [facetType, setFacetType] = useState<"text" | "number" | "boolean">("text");
  const [options, setOptions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const optionsArr = options
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);
      const facet = await ayb.records.create<FacetDefinition>("facet_definitions", {
        library_id: libraryId,
        name,
        facet_type: facetType,
        options: optionsArr.length > 0 ? optionsArr : null,
      });
      onCreated(facet);
    } catch (err: unknown) {
      setError(friendlyError(err).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4">
      <h4 className="font-medium text-gray-900 mb-3">Add Facet</h4>
      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="e.g. Battery Size, Genre, Color"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input flex-1"
            required
            autoFocus
          />
          <select
            value={facetType}
            onChange={(e) => setFacetType(e.target.value as "text" | "number" | "boolean")}
            className="input"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="boolean">Yes/No</option>
          </select>
        </div>
        {facetType === "text" && (
          <input
            type="text"
            placeholder="Predefined options (comma-separated, optional)"
            value={options}
            onChange={(e) => setOptions(e.target.value)}
            className="input"
          />
        )}
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="btn-primary text-sm">
            {loading ? "..." : "Add Facet"}
          </button>
        </div>
      </div>
    </form>
  );
}
