import { Request, Response, NextFunction } from "express";
import { adminAuth, isFirebaseEnabled } from "../config/firebase-admin";

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // If Firebase is not enabled, skip authentication
  if (!isFirebaseEnabled) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        message: "Missing or invalid authorization header"
      }
    });
  }

  const token = authHeader.substring(7);

  try {
    const decodedToken = await adminAuth!.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email
    };
    next();
  } catch (error) {
    return res.status(401).json({
      error: {
        message: "Invalid or expired token"
      }
    });
  }
};
