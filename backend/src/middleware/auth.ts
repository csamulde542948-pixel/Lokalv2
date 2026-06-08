import { Request, Response, NextFunction } from "express";
import { verifySupabaseToken } from "../lib/supabase";
import type { AuthUser } from "../graphql/context";

export interface AuthenticatedRequest extends Request {
  user?: AuthUser | null;
}

function readCookie(req: Request, name: string): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  if (!cookie) return null;
  return decodeURIComponent(cookie.slice(name.length + 1));
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
      : readCookie(req, "lokal_access_token");

    if (token) {
      const user = await verifySupabaseToken(token);
      req.user = user;
    } else {
      req.user = null;
    }
  } catch {
    req.user = null;
  }
  next();
}
