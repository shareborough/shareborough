import { FormEvent, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ayb, persistTokens } from "../lib/ayb";
import { friendlyError } from "../lib/errorMessages";
import Footer from "../components/Footer";
import ThemeToggle from "../components/ThemeToggle";

interface Props {
  mode: "login" | "register";
  onAuth: () => void;
}

export default function AuthPage({ mode, onAuth }: Props) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await ayb.auth.login(email, password);
      } else {
        await ayb.auth.register(email, password);
      }
      persistTokens();
      onAuth();
      navigate("/dashboard");
    } catch (err: unknown) {
      setError(friendlyError(err).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "github") {
    setError("");
    setOauthLoading(provider);
    try {
      // @ts-expect-error signInWithOAuth exists at runtime but missing from @allyourbase/js@0.1.0 types
      await ayb.auth.signInWithOAuth(provider);
      persistTokens();
      onAuth();
      navigate("/dashboard");
    } catch (err: unknown) {
      setError(friendlyError(err).message);
    } finally {
      setOauthLoading(null);
    }
  }

  // Preload Dashboard chunk after successful auth (user will navigate there next)
  useEffect(() => {
    // Preload Dashboard chunk on mount (likely next route after login)
    import("./Dashboard").catch(() => {
      // Silently ignore preload failures
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="card p-8 w-full max-w-sm">
          <Link to="/" className="flex items-center gap-2 mb-6">
            <span className="text-2xl">📚</span>
            <span className="text-lg font-bold text-sage-800">Shareborough</span>
          </Link>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {mode === "login"
              ? "Sign in to manage your lending libraries"
              : "Start cataloging and sharing your stuff"}
          </p>

          {/* Social auth buttons */}
          <div className="flex flex-col gap-2 mb-4">
            <button
              type="button"
              onClick={() => handleOAuth("google")}
              disabled={oauthLoading !== null}
              className="btn-secondary flex items-center justify-center gap-2 w-full disabled:opacity-50"
            >
              {oauthLoading === "google" ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuth("github")}
              disabled={oauthLoading !== null}
              className="btn-secondary flex items-center justify-center gap-2 w-full disabled:opacity-50"
            >
              {oauthLoading === "github" ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              )}
              Continue with GitHub
            </button>
          </div>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-gray-800 px-2 text-gray-400 dark:text-gray-500">or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
              minLength={8}
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary mt-1">
              {loading
                ? "..."
                : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>
          <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <Link to="/signup" className="text-sage-600 hover:underline font-medium">
                  Sign up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link to="/login" className="text-sage-600 hover:underline font-medium">
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
