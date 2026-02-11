interface Props {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-16 h-16 text-xl",
};

/** Color palette for initials avatars (deterministic by name) */
const COLORS = [
  "bg-sage-200 text-sage-700",
  "bg-amber-200 text-amber-700",
  "bg-blue-200 text-blue-700",
  "bg-rose-200 text-rose-700",
  "bg-violet-200 text-violet-700",
  "bg-emerald-200 text-emerald-700",
  "bg-orange-200 text-orange-700",
  "bg-cyan-200 text-cyan-700",
];

function getColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Avatar component — displays user image or colored initials fallback.
 * Color is deterministic (same name = same color across renders).
 */
export default function Avatar({ name, imageUrl, size = "md", className = "" }: Props) {
  const sizeClass = SIZES[size];

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`${sizeClass} rounded-full object-cover ${className}`}
      />
    );
  }

  const colorClass = getColor(name);
  const initials = getInitials(name);

  return (
    <div
      className={`${sizeClass} ${colorClass} rounded-full flex items-center justify-center font-bold select-none ${className}`}
      aria-label={name}
      title={name}
    >
      {initials}
    </div>
  );
}

export { getInitials, getColor };
