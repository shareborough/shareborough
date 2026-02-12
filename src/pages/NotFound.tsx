import { Link } from "react-router-dom";
import Footer from "../components/Footer";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-6xl font-bold text-gray-200 dark:text-gray-700 mb-4">404</p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Page not found</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link to="/" className="btn-primary inline-block">
            Go Home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
