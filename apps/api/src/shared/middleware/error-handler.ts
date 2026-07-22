import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { AppError } from "../errors/app-error.js";

export function notFoundHandler(
  _request: Request,
  response: Response,
  _next: NextFunction,
) {
  response.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "The requested resource could not be found.",
    },
    meta: {
      traceId: randomUUID(),
    },
  });
}

export function errorHandler(
  error: Error,
  _request: Request,
  response: Response,
  _next: NextFunction,
) {
  const traceId = randomUUID();

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      meta: {
        traceId,
      },
    });
    return;
  }

  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred while processing the request.",
    },
    meta: {
      traceId,
    },
  });
}
