import type { Request, Response } from "express";

export function sendJson(_req: Request, res: Response, status: number, body: string, _options: { public: boolean; etag?: string }): void {
  res.status(status).type("application/json");
  if (status === 204) { res.end(); return; }
  res.send(body);
}
