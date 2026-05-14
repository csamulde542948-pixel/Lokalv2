import { Request, Response, NextFunction } from "express";
import { verifySupabaseToken } from "../lib/supabase";
import type { AuthUser } from "../graphql/context";

export interface AuthenticatedRequest extends Request {
  user?: AuthUser | null;
}

/**
 * Express middleware that extracts and verifies the Supabase JWT
 * from the Authorization header. Attaches the user to req.user.
 * Does NOT block unauthenticated requests — resolvers decide that.
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (token) {
      const user = await verifySupabaseToken(token);
      req.user = user;
      if (user) {
        console.log('[AUTH] User authenticated:', { id: user.id, email: user.email });
      } else {
        console.log('[AUTH] Token verification failed');
      }
    } else {
      req.user = null;
      console.log('[AUTH] No token provided');
    }
  } catch {
    req.user = null;
  }
  next();
}
