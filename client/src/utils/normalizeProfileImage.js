export default function normalizeProfileImage(rawValue) {
  if (!rawValue) return null;
  const raw = String(rawValue || "").trim();

  // If it's already a data URI, return as-is
  if (raw.startsWith("data:")) return raw;

  // If it's raw SVG markup, encode as data URI
  if (/^<\?xml|^<svg/i.test(raw)) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(raw)}`;
  }

  // If it looks like base64 (very permissive), assume PNG
  if (/^[A-Za-z0-9+/=\r\n]+$/.test(raw) && raw.length > 32) {
    return `data:image/png;base64,${raw}`;
  }

  // If it looks like a URL, use as-is
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith("/")) {
    return raw;
  }

  // Otherwise, no usable image
  return null;
}
