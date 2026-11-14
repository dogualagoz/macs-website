import { expect, test } from "bun:test";
import request from "supertest";
import { createApp } from "./app";
import { parseEnv } from "./config/env";
import { testDeps } from "../test/helpers/app";

const env = parseEnv({ DATABASE_URL: "postgresql://u:p@db:5432/x", JWT_SECRET_KEY: "x".repeat(32), NODE_ENV: "test" });
const app = createApp(testDeps({ env }));

test("GET / returns welcome", async () => {
  const response = await request(app).get("/");
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ message: "MACS Kulubu Web Sitesine hosgeldiniz!" });
});

test("GET /health", async () => {
  const response = await request(app).get("/health");
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ status: "ok" });
});

test("system responses omit framework and automatic cache headers", async () => {
  const response = await request(app).get("/health");
  expect(response.headers["x-powered-by"]).toBeUndefined();
  expect(response.headers.etag).toBeUndefined();
});

test("createApp trusts one proxy hop", () => {
  const trustProxy = app.get("trust proxy") as number;
  expect(trustProxy).toBe(1);
});
