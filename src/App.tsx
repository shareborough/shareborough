import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { useEffect, useState, Suspense, lazy } from "react";
import { isLoggedIn, validateSession } from "./lib/ayb";
import { useToast } from "./hooks/useToast";
import { useServiceWorker } from "./hooks/useServiceWorker";
import NavBar from "./components/NavBar";
import OfflineBanner from "./components/OfflineBanner";
import LoadingFallback from "./components/LoadingFallback";
import ChunkErrorBoundary from "./components/ChunkErrorBoundary";

// Eager load: critical first-page routes for SEO and immediate rendering
import Landing from "./pages/Landing";
import AuthPage from "./pages/AuthPage";

// Lazy load: authenticated routes (loaded after login)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const LibraryDetail = lazy(() => import("./pages/LibraryDetail"));
const AddItem = lazy(() => import("./pages/AddItem"));
const EditItem = lazy(() => import("./pages/EditItem"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Settings = lazy(() => import("./pages/Settings"));

// Lazy load: public routes (loaded on-demand)
const PublicLibrary = lazy(() => import("./pages/PublicLibrary"));
const PublicItem = lazy(() => import("./pages/PublicItem"));
const BorrowConfirmation = lazy(() => import("./pages/BorrowConfirmation"));

// Lazy load: 404 (rarely accessed)
const NotFound = lazy(() => import("./pages/NotFound"));

export default function App() {
  const [authed, setAuthed] = useState(isLoggedIn());
  const navigate = useNavigate();
  const toast = useToast();
  const { updateAvailable } = useServiceWorker();

  // Validate session on mount
  useEffect(() => {
    if (!authed) return;
    validateSession().then((result) => {
      if (result === "expired") {
        setAuthed(false);
        toast.showWarning(
          "Session expired",
          "Please sign in again to continue.",
        );
        navigate("/login");
      } else if (result === "offline") {
        toast.showWarning(
          "Server unreachable",
          "Unable to verify your session. Some features may not work.",
        );
      }
    });
  }, []);

  // Listen for auth expiry events (from rpc.ts 401 handler)
  useEffect(() => {
    function handleAuthExpired() {
      setAuthed(false);
      toast.showWarning(
        "Session expired",
        "Please sign in again to continue.",
      );
      navigate("/login");
    }
    window.addEventListener("ayb:auth-expired", handleAuthExpired);
    return () => window.removeEventListener("ayb:auth-expired", handleAuthExpired);
  }, [navigate, toast]);

  // Handle service worker updates
  useEffect(() => {
    if (updateAvailable) {
      toast.showSuccess("Update available", "A new version is available. Refresh to update.");
      // TODO: Add custom toast with refresh button
    }
  }, [updateAvailable, toast]);

  return (
    <ChunkErrorBoundary>
      <div className="min-h-screen bg-warm-50 dark:bg-gray-900">
        <OfflineBanner />
        <Suspense fallback={<LoadingFallback route="page" variant="page" />}>
          <Routes>
            {/* Public routes — no navbar */}
            <Route path="/" element={<Landing authed={authed} />} />
            <Route
              path="/login"
              element={
                authed ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <AuthPage mode="login" onAuth={() => setAuthed(true)} />
                )
              }
            />
            <Route
              path="/signup"
              element={
                authed ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <AuthPage mode="register" onAuth={() => setAuthed(true)} />
                )
              }
            />
            <Route path="/l/:slug" element={<PublicLibrary />} />
            <Route path="/l/:slug/:itemId" element={<PublicItem />} />
            <Route path="/borrow/:requestId" element={<BorrowConfirmation />} />

            {/* Owner routes — with navbar + auth guard */}
            <Route
              path="/dashboard"
              element={
                authed ? (
                  <>
                    <NavBar onLogout={() => setAuthed(false)} />
                    <Dashboard />
                  </>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/dashboard/library/:id"
              element={
                authed ? (
                  <>
                    <NavBar onLogout={() => setAuthed(false)} />
                    <LibraryDetail />
                  </>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/dashboard/library/:id/add"
              element={
                authed ? (
                  <>
                    <NavBar onLogout={() => setAuthed(false)} />
                    <AddItem />
                  </>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/dashboard/notifications"
              element={
                authed ? (
                  <>
                    <NavBar onLogout={() => setAuthed(false)} />
                    <Notifications />
                  </>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/dashboard/library/:id/edit/:itemId"
              element={
                authed ? (
                  <>
                    <NavBar onLogout={() => setAuthed(false)} />
                    <EditItem />
                  </>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/dashboard/settings"
              element={
                authed ? (
                  <>
                    <NavBar onLogout={() => setAuthed(false)} />
                    <Settings />
                  </>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            {/* 404 catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
    </ChunkErrorBoundary>
  );
}
