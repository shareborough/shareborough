import { FormEvent, useState } from "react";
import {
  quickPhoneAuth,
  requestOTP,
  verifyOTP,
  getPhoneSession,
  clearPhoneSession,
  normalizePhone,
  type PhoneSession,
} from "../lib/phoneAuth";
import { friendlyError } from "../lib/errorMessages";
import { useToast } from "../hooks/useToast";

interface Props {
  /** Called when phone session is established */
  onAuth: (session: PhoneSession) => void;
  /** If true, try OTP flow first; otherwise use quick auth */
  requireOTP?: boolean;
}

/**
 * Phone-based auth component.
 * Step 1: Enter name + phone number
 * Step 2 (if OTP enabled): Enter the code sent via SMS
 * Step 3: Session established, callback fires
 *
 * If OTP infrastructure isn't available, falls back to quick auth
 * (phone + name stored locally — sufficient for borrowing since owner must approve).
 */
export default function PhoneAuth({ onAuth, requireOTP = false }: Props) {
  const existing = getPhoneSession();
  const [step, setStep] = useState<"phone" | "code" | "done">(
    existing ? "done" : "phone",
  );
  const [name, setName] = useState(existing?.name ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const toast = useToast();

  async function handlePhoneSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (requireOTP) {
      try {
        await requestOTP(phone);
        setStep("code");
      } catch {
        // OTP not available — fall back to quick auth
        const session = quickPhoneAuth(phone, name);
        toast.showWarning(
          "Verification unavailable",
          "We couldn't send a verification code. Your info has been saved locally.",
        );
        onAuth(session);
        setStep("done");
      }
    } else {
      const session = quickPhoneAuth(phone, name);
      onAuth(session);
      setStep("done");
    }
    setLoading(false);
  }

  async function handleCodeSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const session = await verifyOTP(phone, code);
      session.name = name;
      onAuth(session);
      setStep("done");
    } catch (err) {
      setError(friendlyError(err).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyNow() {
    if (!existing) return;
    setVerifyLoading(true);
    try {
      await requestOTP(existing.phone);
      setPhone(existing.phone);
      setName(existing.name);
      setStep("code");
    } catch {
      toast.showWarning(
        "Verification unavailable",
        "We couldn't send a verification code right now. Try again later.",
      );
    } finally {
      setVerifyLoading(false);
    }
  }

  function handleSignOut() {
    clearPhoneSession();
    setStep("phone");
    setName("");
    setPhone("");
    setCode("");
  }

  if (step === "done" && existing) {
    return (
      <div className="p-3 bg-sage-50 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-sage-200 flex items-center justify-center text-sage-700 text-sm font-bold">
            {(existing.name || "?")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">
                {existing.name || "Phone user"}
              </p>
              {existing.verified ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                  Not verified
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">{existing.phone}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Sign out
          </button>
        </div>
        {!existing.verified && (
          <div className="mt-2 pt-2 border-t border-sage-200">
            <p className="text-xs text-amber-600 mb-1.5">
              Your session is saved locally. The library owner will verify your
              identity at pickup.
            </p>
            <button
              onClick={handleVerifyNow}
              disabled={verifyLoading}
              className="text-xs font-medium text-sage-700 hover:text-sage-900"
            >
              {verifyLoading ? "Sending code..." : "Verify now"}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (step === "code") {
    return (
      <form onSubmit={handleCodeSubmit} className="flex flex-col gap-3">
        <p className="text-sm text-gray-600">
          Enter the code sent to <strong>{normalizePhone(phone)}</strong>
        </p>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="6-digit code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="input text-center text-lg tracking-widest"
          maxLength={6}
          required
          autoFocus
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? "Verifying..." : "Verify"}
          </button>
          <button
            type="button"
            onClick={() => setStep("phone")}
            className="btn-secondary"
          >
            Back
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-3">
      <input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="input"
        required
        autoFocus
      />
      <input
        type="tel"
        placeholder="Phone number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="input"
        required
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "..." : "Continue"}
      </button>
    </form>
  );
}
