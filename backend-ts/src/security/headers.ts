export function applySecurityHeaders(headers: Headers, opts: { forwardedProto?: string | null | undefined; isDocs: boolean }): void {
  for (const [key, value] of Object.entries({
    "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Cross-Origin-Resource-Policy": "same-site", "Cross-Origin-Opener-Policy": "same-origin",
    "Content-Security-Policy": opts.isDocs
      ? "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'"
      : "default-src 'none'; frame-ancestors 'none'",
  })) headers.set(key, value);
  if (opts.forwardedProto === "https") headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  else headers.delete("Strict-Transport-Security");
  headers.delete("Server"); headers.delete("X-Powered-By");
}
