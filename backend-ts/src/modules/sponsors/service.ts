import type { Logger } from "pino";
import { HttpError } from "../../lib/http-error";
import { geocodeResponseSchema } from "./schemas";
import type { GeocodeResponse } from "./schemas";

export type FetchImpl = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
export function requiredSponsorJson(json: string | null, id: number): string {
  if (json === null) throw new HttpError(404, `ID ${String(id)} olan sponsor bulunamadı`);
  return json;
}
export async function geocodeAddress(address: string, fetchImpl: FetchImpl, userAgent: string, logger: Logger): Promise<GeocodeResponse> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.search = new URLSearchParams({ q: address, format: "json", limit: "1", countrycodes: "tr" }).toString();
  let data: unknown;
  try {
    const response = await fetchImpl(url, { headers: { "User-Agent": userAgent }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`Geocoding upstream HTTP ${String(response.status)}`);
    data = await response.json();
  } catch (error: unknown) {
    if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
      throw new HttpError(504, "Geocoding servisi yanıt vermiyor. Lütfen tekrar deneyin.");
    }
    logger.error({ err: error }, "Geocoding isteği başarısız"); throw new HttpError(500, "Geocoding servisine ulaşılamadı");
  }
  if (Array.isArray(data) && data.length === 0) throw new HttpError(404, "Adres bulunamadı. Lütfen daha detaylı bir adres girin.");
  if (!Array.isArray(data) || data[0] === null || typeof data[0] !== "object") throw new Error("Invalid geocoding response");
  const result = data[0] as Record<string, unknown>;
  return geocodeResponseSchema.parse({ latitude: Number(result.lat), longitude: Number(result.lon), formatted_address: result.display_name });
}
