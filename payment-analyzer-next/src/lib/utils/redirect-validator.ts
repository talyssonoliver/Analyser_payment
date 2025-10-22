/**
 * Redirect Validation Utility
 *
 * Prevents open redirect vulnerabilities (CWE-601)
 */

const ALLOWED_REDIRECTS = [
  "/dashboard",
  "/analysis",
  "/history",
  "/settings",
  "/reports",
  "/profile",
];

export const validateRedirectPath = (path: string | null): string => {
  if (!path) return "/dashboard";

  // Ensure path is internal (starts with /)
  if (!path.startsWith("/")) return "/dashboard";

  // Ensure no protocol (prevents external redirects)
  if (path.includes("://")) return "/dashboard";

  // Check against allowlist
  const isAllowed = ALLOWED_REDIRECTS.some((allowed) => path.startsWith(allowed));

  return isAllowed ? path : "/dashboard";
};
