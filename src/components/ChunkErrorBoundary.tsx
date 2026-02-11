import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary for lazy-loaded route chunks
 * Catches dynamic import failures and shows friendly retry UI
 */
export default class ChunkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is a chunk loading error
    const isChunkError =
      error.name === "ChunkLoadError" ||
      error.message.includes("Failed to fetch dynamically imported module") ||
      error.message.includes("Importing a module script failed");

    return {
      hasError: isChunkError,
      error: isChunkError ? error : null,
    };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    // Log chunk errors for debugging
    if (this.state.hasError) {
      console.error("Chunk load error:", error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen bg-warm-50 flex items-center justify-center px-4"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-md text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-sage-900 mb-4">
              Something went wrong
            </h1>
            <p className="text-sage-700 mb-6">
              We couldn't load this page. This might be due to a network issue
              or an outdated version of the app.
            </p>
            <button
              onClick={this.handleReload}
              className="btn-primary"
              aria-label="Reload page to fix error"
            >
              Reload Page
            </button>
            <p className="text-sm text-sage-600 mt-4">
              If this problem persists, try clearing your browser cache.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
