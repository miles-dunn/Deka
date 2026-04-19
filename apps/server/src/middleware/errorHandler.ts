import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/httpError";

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  next(new HttpError(404, `Route not found: ${req.method} ${req.path}`));
};

export const errorHandler = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({
      error: {
        message: error.message,
        details: error.details
      }
    });
  }

  console.error(error);

  return res.status(500).json({
    error: {
      message: "Internal server error"
    }
  });
};
