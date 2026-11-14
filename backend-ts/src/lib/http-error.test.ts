import { expect, test } from "bun:test";
import { HttpError, unauthorized } from "./http-error";

test("HttpError preserves validation items as detail without a wrapper", () => {
  const items = [{ type: "missing", loc: ["body", "name"], msg: "Field required" }];
  const error = new HttpError(422, items);
  expect(error).toBeInstanceOf(Error);
  expect(error.status).toBe(422);
  expect({ detail: error.detail }).toEqual({ detail: items });
  expect(error.headers).toBeUndefined();
});

test("unauthorized carries the detail and Bearer challenge", () => {
  const error = unauthorized("Token eksik");
  expect(error).toBeInstanceOf(HttpError);
  expect(error.status).toBe(401);
  expect(error.detail).toBe("Token eksik");
  expect(error.headers).toEqual({ "WWW-Authenticate": "Bearer" });
});
