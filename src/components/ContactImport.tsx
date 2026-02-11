import { useState } from "react";

interface Contact {
  name: string;
  phone: string;
}

interface Props {
  /** Called with imported contacts */
  onImport: (contacts: Contact[]) => void;
  /** Label for the import button */
  buttonLabel?: string;
}

/**
 * Contact import component.
 * Uses the Contact Picker API on supported devices (Android Chrome),
 * falls back to manual entry form on unsupported platforms.
 */
export default function ContactImport({ onImport, buttonLabel = "Import Contacts" }: Props) {
  const [manualMode, setManualMode] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [staged, setStaged] = useState<Contact[]>([]);
  const [error, setError] = useState("");

  const hasContactPicker = "contacts" in navigator && "ContactsManager" in window;

  async function handlePickContacts() {
    setError("");
    try {
      // Contact Picker API — only available on Android Chrome
      const contacts = await (navigator as ContactPickerNavigator).contacts.select(
        ["name", "tel"],
        { multiple: true },
      );
      const parsed: Contact[] = contacts
        .filter((c: ContactPickerResult) => c.tel?.length > 0)
        .map((c: ContactPickerResult) => ({
          name: c.name?.[0] ?? "Unknown",
          phone: c.tel[0],
        }));
      if (parsed.length > 0) {
        onImport(parsed);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "InvalidStateError") {
        // User cancelled the picker
        return;
      }
      setError("Could not access contacts. Try adding manually.");
      setManualMode(true);
    }
  }

  function handleAddManual() {
    if (!manualName.trim() || !manualPhone.trim()) return;
    const contact = { name: manualName.trim(), phone: manualPhone.trim() };
    setStaged((prev) => [...prev, contact]);
    setManualName("");
    setManualPhone("");
  }

  function handleRemoveStaged(index: number) {
    setStaged((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDoneManual() {
    if (staged.length > 0) {
      onImport(staged);
      setStaged([]);
    }
    setManualMode(false);
  }

  if (manualMode) {
    return (
      <div className="flex flex-col gap-3">
        <h4 className="text-sm font-medium text-gray-700">Add members</h4>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Name"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            className="input flex-1"
          />
          <input
            type="tel"
            placeholder="Phone"
            value={manualPhone}
            onChange={(e) => setManualPhone(e.target.value)}
            className="input flex-1"
          />
          <button
            type="button"
            onClick={handleAddManual}
            className="btn-secondary text-sm shrink-0"
            disabled={!manualName.trim() || !manualPhone.trim()}
          >
            Add
          </button>
        </div>
        {staged.length > 0 && (
          <div className="flex flex-col gap-1">
            {staged.map((c, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5 text-sm">
                <span>
                  {c.name} <span className="text-gray-400">{c.phone}</span>
                </span>
                <button
                  onClick={() => handleRemoveStaged(i)}
                  className="text-red-400 hover:text-red-600 text-xs"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDoneManual}
            className="btn-primary text-sm flex-1"
            disabled={staged.length === 0}
          >
            Import {staged.length} contact{staged.length !== 1 ? "s" : ""}
          </button>
          <button
            type="button"
            onClick={() => { setManualMode(false); setStaged([]); }}
            className="btn-secondary text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <div className="flex gap-2">
        {hasContactPicker && (
          <button
            type="button"
            onClick={handlePickContacts}
            className="btn-primary text-sm"
          >
            {buttonLabel}
          </button>
        )}
        <button
          type="button"
          onClick={() => setManualMode(true)}
          className="btn-secondary text-sm"
        >
          {hasContactPicker ? "Add Manually" : buttonLabel}
        </button>
      </div>
    </div>
  );
}

// Types for Contact Picker API
interface ContactPickerResult {
  name?: string[];
  tel: string[];
  email?: string[];
}

interface ContactPickerNavigator extends Navigator {
  contacts: {
    select: (
      properties: string[],
      options?: { multiple?: boolean },
    ) => Promise<ContactPickerResult[]>;
  };
}
