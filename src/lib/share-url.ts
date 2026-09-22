/**
 * Public origin students should use. Preview/dev hostnames are owner-only,
 * so links and QR codes always point at the published site instead.
 */
export const PUBLIC_ORIGIN = "https://senior-attend-buddy.lovable.app";

function isPrivateHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname.startsWith("id-preview--") ||
    hostname.includes("-dev.lovable.app")
  );
}

export function shareOrigin() {
  if (typeof window === "undefined") return PUBLIC_ORIGIN;
  return isPrivateHost(window.location.hostname)
    ? PUBLIC_ORIGIN
    : window.location.origin;
}

export function sessionCheckInUrl(code: string) {
  return `${shareOrigin()}/s/${code}`;
}
