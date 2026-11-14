export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly detail: unknown,
    readonly headers?: Record<string, string>,
  ) {
    super(typeof detail === "string" ? detail : `HTTP ${status.toString()}`);
    this.name = "HttpError";
  }
}

export const unauthorized = (detail: string): HttpError =>
  new HttpError(401, detail, { "WWW-Authenticate": "Bearer" });
