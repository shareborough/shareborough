import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import ThemeToggle from "../components/ThemeToggle";

interface Props {
  authed: boolean;
}

export default function Landing({ authed }: Props) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <header className="px-4 py-3 sm:py-4 flex justify-between items-center max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📚</span>
          <span className="text-lg sm:text-xl font-bold text-sage-800 dark:text-sage-300">Shareborough</span>
        </div>
        <div className="flex gap-2 sm:gap-3">
          {authed ? (
            <Link to="/dashboard" className="btn-primary min-h-[44px] flex items-center">
              My Libraries
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn-secondary min-h-[44px] flex items-center">
                Sign in
              </Link>
              <Link to="/signup" className="btn-primary min-h-[44px] flex items-center">
                Get Started
              </Link>
            </>
          )}
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-gray-100 mb-4 tracking-tight">
          Lend stuff to <br />
          <span className="text-sage-600 dark:text-sage-400">your friends</span>
        </h1>
        <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 max-w-lg mb-8 leading-relaxed">
          Catalog your things, share a library link, and let friends borrow
          with zero friction. No sign-up needed to borrow.
        </p>
        <div className="flex gap-3">
          {authed ? (
            <Link to="/dashboard" className="btn-primary text-base px-6 py-3 min-h-[48px] flex items-center">
              Go to Dashboard
            </Link>
          ) : (
            <Link to="/signup" className="btn-primary text-base px-6 py-3 min-h-[48px] flex items-center">
              Start Your Library
            </Link>
          )}
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-20 max-w-3xl w-full">
          <FeatureCard
            icon="📸"
            title="Snap & Catalog"
            desc="Take a photo, add a name — your item is cataloged in seconds."
          />
          <FeatureCard
            icon="🔗"
            title="Share a Link"
            desc="Friends browse your library and request to borrow. No app needed."
          />
          <FeatureCard
            icon="📱"
            title="SMS Reminders"
            desc="Borrowers get friendly text reminders when it's time to return."
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="card p-6 text-left">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
    </div>
  );
}
