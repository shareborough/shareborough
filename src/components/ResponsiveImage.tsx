/**
 * ResponsiveImage component with srcset support.
 * Generates responsive image URLs with width query params for future backend/CDN support.
 * Currently all URLs resolve to the same image (AYB storage ignores unknown params),
 * but semantic HTML is ready for when image resizing is added to backend or CDN.
 *
 * Relative /api/ paths are resolved against VITE_AYB_URL so images load from
 * the backend (api.shareborough.com) instead of the frontend (shareborough.com).
 */

const API_BASE = import.meta.env.VITE_AYB_URL ?? "";

/** Resolve relative /api/ paths to absolute backend URLs */
function resolveImageUrl(src: string): string {
  if (src.startsWith("/api/") && API_BASE) {
    return `${API_BASE}${src}`;
  }
  return src;
}

interface Props {
  src: string;
  alt: string;
  className?: string;
  /**
   * Sizes attribute for browser selection hints.
   * Default: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
   * Meaning: full width on mobile, half width on tablet, third width on desktop.
   */
  sizes?: string;
  /**
   * Whether to use lazy loading. Default: true for remote images.
   */
  loading?: "lazy" | "eager";
  /**
   * Whether to use async decoding. Default: true.
   */
  decoding?: "async" | "sync" | "auto";
}

/**
 * Generate srcset string with width-based variants.
 * Adds ?w={width} query param to each URL for future backend/CDN image resizing support.
 */
function generateSrcSet(baseUrl: string): string {
  const widths = [375, 640, 768, 1024, 1280];
  return widths
    .map((w) => {
      // Handle absolute URLs (preserve full URL) vs relative URLs
      const url = baseUrl.startsWith("http")
        ? new URL(baseUrl)
        : new URL(baseUrl, window.location.origin);
      url.searchParams.set("w", w.toString());

      // For absolute URLs, return full URL. For relative, return pathname + search.
      const urlString = baseUrl.startsWith("http")
        ? url.toString()
        : `${url.pathname}${url.search}`;

      return `${urlString} ${w}w`;
    })
    .join(", ");
}

export default function ResponsiveImage({
  src,
  alt,
  className = "",
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  loading = "lazy",
  decoding = "async",
}: Props) {
  // Only apply srcset to remote images (not data URLs for previews)
  const isDataUrl = src.startsWith("data:");
  const isRemoteImage = !isDataUrl && src.length > 0;

  if (isRemoteImage) {
    const resolved = resolveImageUrl(src);
    return (
      <img
        src={resolved}
        srcSet={generateSrcSet(resolved)}
        sizes={sizes}
        alt={alt}
        className={className}
        loading={loading}
        decoding={decoding}
      />
    );
  }

  // Data URL or empty src: no srcset, no lazy loading
  return <img src={src} alt={alt} className={className} />;
}
