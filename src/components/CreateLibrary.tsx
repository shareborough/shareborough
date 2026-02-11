import { FormEvent, useState } from "react";
import { ayb } from "../lib/ayb";
import { friendlyError } from "../lib/errorMessages";
import type { Library } from "../types";

interface Props {
  onCreated: (lib: Library) => void;
}

export default function CreateLibrary({ onCreated }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function nameToSlug(n: string) {
    return n
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 60);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const me = await ayb.auth.me();
      const slug = nameToSlug(name) + "-" + Math.random().toString(36).slice(2, 6);
      const lib = await ayb.records.create<Library>("libraries", {
        owner_id: me.id,
        name,
        slug,
        description: description || null,
        is_public: true,
      });
      onCreated(lib);
    } catch (err: unknown) {
      setError(friendlyError(err).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5">
      <h3 className="font-semibold text-gray-900 mb-3">New Library</h3>
      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            placeholder="e.g. Power Tools, Board Games, Books..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input w-full"
            required
            autoFocus
          />
          {name && (
            <p className="text-xs text-gray-400 mt-1">
              Link: shareborough.app/l/{nameToSlug(name)}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            placeholder="What kind of stuff is in this library?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input w-full resize-none"
            rows={2}
          />
        </div>
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Creating..." : "Create Library"}
          </button>
        </div>
      </div>
    </form>
  );
}
