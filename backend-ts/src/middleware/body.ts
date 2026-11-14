import express from "express";
import type { RequestHandler } from "express";
import { HttpError } from "../lib/http-error";

const deferParseErrors = (parser: RequestHandler): RequestHandler => (req, res, next) => {
  parser(req, res, (error?: unknown) => {
    if (error !== undefined) {
      if (typeof error === "object" && error !== null && "type" in error && error.type === "entity.too.large") {
        next(new HttpError(413, "İstek gövdesi çok büyük"));
        return;
      }
      req.bodyParseError = error;
    }
    next();
  });
};

export const bodyParsers: RequestHandler[] = [
  deferParseErrors(express.json({ limit: "2mb" })),
  deferParseErrors(express.urlencoded({ extended: false, limit: "2mb" })),
];
