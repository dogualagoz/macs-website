export interface SecurityConfig {
  globalRateLimit: { ratePerMin: number; burst: number };
  writeRateLimit: { ratePerMin: number; burst: number };
  maxTrackedIps: number;
  loginIpLimit: { maxAttempts: number; windowMs: number };
  maxUrlLength: number;
  maxHeaderCount: number;
  maxHeaderBytes: number;
  maxBodyBytes: number;
  uploadOverheadBytes: number;
  idleTimeoutSec: number;
  handlerTimeoutMs: number;
}
export const MAX_JSON_BODY_BYTES = 2 * 1024 * 1024;
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  globalRateLimit: { ratePerMin: 1200, burst: 200 },
  writeRateLimit: { ratePerMin: 60, burst: 60 },
  maxTrackedIps: 50_000,
  loginIpLimit: { maxAttempts: 20, windowMs: 900_000 },
  maxUrlLength: 2048, maxHeaderCount: 100, maxHeaderBytes: 16_384,
  maxBodyBytes: MAX_JSON_BODY_BYTES, uploadOverheadBytes: 262_144,
  idleTimeoutSec: 10, handlerTimeoutMs: 15_000,
};
