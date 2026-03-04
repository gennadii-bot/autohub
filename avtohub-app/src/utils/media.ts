const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const PLACEHOLDER_STO =
  "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&h=400&fit=crop";

/** Build full STO image URL from relative path. */
export function getStoImageUrl(relativeUrl: string | null | undefined): string {
  if (!relativeUrl) return PLACEHOLDER_STO;
  if (relativeUrl.startsWith("http")) return relativeUrl;
  const base = API_BASE.replace(/\/$/, "");
  const path = relativeUrl.startsWith("/") ? relativeUrl : `/${relativeUrl}`;
  return `${base}${path}`;
}
