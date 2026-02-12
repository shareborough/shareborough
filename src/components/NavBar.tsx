import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { ayb, clearPersistedTokens } from "../lib/ayb";
import Avatar from "./Avatar";
import ThemeToggle from "./ThemeToggle";

interface Props {
  onLogout: () => void;
}

function getUserEmail(): string {
  try {
    if (!ayb.token) return "";
    const payload = ayb.token.split(".")[1];
    return JSON.parse(atob(payload))?.email ?? "";
  } catch {
    return "";
  }
}

export default function NavBar({ onLogout }: Props) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  function handleLogout() {
    setMenuOpen(false);
    clearPersistedTokens();
    onLogout();
    navigate("/login");
  }

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const userEmail = getUserEmail();

  return (
    <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 sm:px-4 py-2 sm:py-3 flex justify-between items-center sticky top-0 z-50">
      <Link to="/dashboard" className="flex items-center gap-2 min-h-[44px]">
        <span className="text-xl">📚</span>
        <span className="text-lg font-bold text-sage-800 dark:text-sage-300 hidden sm:inline">Shareborough</span>
      </Link>
      <div className="flex items-center gap-1 sm:gap-2">
        <Link
          to="/dashboard"
          className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 px-2 sm:px-3 py-2 min-h-[44px] flex items-center rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          My Libraries
        </Link>
        <ThemeToggle />
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center gap-1 px-1 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
            aria-expanded={menuOpen}
            aria-haspopup="true"
            aria-label="Account menu"
          >
            {userEmail ? (
              <Avatar name={userEmail} size="sm" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-400 dark:text-gray-300 text-xs">?</div>
            )}
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
              role="menu"
            >
              {userEmail && (
                <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 truncate">
                  {userEmail}
                </div>
              )}
              <Link
                to="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                role="menuitem"
              >
                My Libraries
              </Link>
              <Link
                to="/dashboard/settings"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                role="menuitem"
              >
                Settings
              </Link>
              <div className="border-t border-gray-100 dark:border-gray-700 my-1" role="separator" />
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                role="menuitem"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
