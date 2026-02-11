import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ayb } from "../lib/ayb";
import { friendlyError } from "../lib/errorMessages";
import { useToast } from "../hooks/useToast";
import { usePushNotifications } from "../hooks/usePushNotifications";
import type { UserProfile } from "../types";
import Skeleton from "../components/Skeleton";
import Footer from "../components/Footer";

export default function Settings() {
  const navigate = useNavigate();
  const toast = useToast();
  const pushNotifications = usePushNotifications();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      // Get email and user ID from auth endpoint
      const me = await ayb.auth.me();
      const user = me as { id?: string; email?: string };
      setEmail(user.email ?? "");
      setUserId(user.id ?? "");

      // Try to load existing profile
      const { items } = await ayb.records.list<UserProfile>("user_profiles", {
        perPage: 1,
      });
      if (items.length > 0) {
        setDisplayName(items[0].display_name ?? "");
        setPhone(items[0].phone ?? "");
      }
    } catch {
      // Profile table may not exist yet — that's okay
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // Try to find existing profile
      const { items } = await ayb.records.list<UserProfile>("user_profiles", {
        perPage: 1,
      });
      const body = { display_name: displayName || null, phone: phone || null };
      if (items.length > 0) {
        await ayb.records.update("user_profiles", items[0].id, body);
      } else {
        // Include user_id when creating new profile
        await ayb.records.create("user_profiles", { ...body, user_id: userId });
      }
      toast.showSuccess("Settings saved");
    } catch (err) {
      const { message } = friendlyError(err);
      toast.showError("Couldn't save settings", message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="max-w-lg mx-auto p-4 sm:p-6" aria-label="Loading settings">
        <Skeleton className="h-7 w-24 mb-6" />
        <div className="card p-6 flex flex-col gap-4">
          <div>
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div>
            <Skeleton className="h-4 w-28 mb-2" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <Skeleton className="h-10 w-full rounded-lg mt-2" />
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="max-w-lg mx-auto p-4 sm:p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Settings</h1>

        <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              disabled
              className="input bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How others see you"
              className="input"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="input"
            />
            <p className="text-xs text-gray-400 mt-1">Used for SMS reminders about your loans</p>
          </div>

          <button type="submit" disabled={saving} className="btn-primary mt-2">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>

        {/* Push Notifications Section */}
        <div className="card p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Push Notifications
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Get instant alerts when someone requests to borrow your items
          </p>

          {pushNotifications.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              {pushNotifications.error}
            </div>
          )}

          {pushNotifications.permission === "denied" && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm mb-4">
              Notifications are blocked. Please enable them in your browser settings.
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  pushNotifications.isSubscribed
                    ? "bg-sage-100 text-sage-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {pushNotifications.isSubscribed ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636"
                    />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {pushNotifications.isSubscribed
                    ? "Notifications enabled"
                    : "Notifications disabled"}
                </p>
                <p className="text-xs text-gray-500">
                  {pushNotifications.isSubscribed
                    ? "You'll receive borrow request alerts"
                    : "Enable to receive instant alerts"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                if (pushNotifications.isSubscribed) {
                  const success = await pushNotifications.unsubscribe();
                  if (success) {
                    toast.showSuccess("Notifications disabled");
                  }
                } else {
                  const success = await pushNotifications.subscribe();
                  if (success) {
                    toast.showSuccess("Notifications enabled");
                  } else if (pushNotifications.permission === "denied") {
                    toast.showWarning(
                      "Notifications blocked",
                      "Please enable notifications in your browser settings"
                    );
                  }
                }
              }}
              disabled={
                pushNotifications.isLoading ||
                pushNotifications.permission === "denied"
              }
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pushNotifications.isSubscribed
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  : "bg-sage-600 text-white hover:bg-sage-700"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {pushNotifications.isLoading
                ? "Loading..."
                : pushNotifications.isSubscribed
                  ? "Disable"
                  : "Enable"}
            </button>
          </div>
        </div>

        {/* Danger Zone: Account Deletion */}
        <div className="card p-6 mt-6 border-red-200">
          <h2 className="text-lg font-semibold text-red-700 mb-3">
            Danger Zone
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Permanently delete your account and all associated data (libraries, items, loans).
            This action cannot be undone.
          </p>

          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
            >
              Delete Account
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium mb-3">
                Type your email to confirm: <strong>{email}</strong>
              </p>
              <input
                type="email"
                value={deleteConfirmEmail}
                onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                placeholder="Type your email to confirm"
                className="input mb-3"
                aria-label="Confirm email for deletion"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    setDeleting(true);
                    try {
                      await ayb.auth.deleteAccount();
                      toast.showSuccess("Account deleted");
                      navigate("/");
                    } catch (err) {
                      const { message } = friendlyError(err);
                      toast.showError("Couldn't delete account", message);
                    } finally {
                      setDeleting(false);
                    }
                  }}
                  disabled={deleteConfirmEmail !== email || deleting}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? "Deleting..." : "Delete My Account"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmEmail("");
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
