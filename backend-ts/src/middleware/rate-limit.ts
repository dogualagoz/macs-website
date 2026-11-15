// Compatibility exports until Tasks 6–10 import the security module directly.
export { perMinute, perHour, routeRateLimit } from "../security/rate-limit";
export type { RateLimitSpec } from "../security/rate-limit";
