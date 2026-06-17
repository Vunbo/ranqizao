import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { HttpError } from './http';

// ---------------------------------------------------------------------------
// User auth (legacy — kept for backward compatibility, delegates to factory)
// ---------------------------------------------------------------------------

export interface AuthUser {
  userId: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export const signAuthToken = (user: AuthUser) =>
  jwt.sign(user, env.jwtSecret, { expiresIn: '7d' });

export const { requireAuth } = createAuthMiddleware<'user', AuthUser>({
  secret: () => env.jwtSecret,
  requestKey: 'user',
  errorMessages: {
    noToken: '未登录或登录已失效。',
    invalidToken: '登录状态无效，请重新登录。',
  },
});

// ---------------------------------------------------------------------------
// Admin auth (legacy — kept for backward compatibility, delegates to factory)
// ---------------------------------------------------------------------------

export interface AdminAuthUser {
  adminId: string;
  username: string;
  displayName: string;
  role: 'super_admin' | 'ops_admin' | 'ops_viewer';
}

export interface AdminAuthenticatedRequest extends Request {
  admin?: AdminAuthUser;
}

export const signAdminAuthToken = (user: AdminAuthUser) =>
  jwt.sign(user, env.opsJwtSecret, { expiresIn: '7d' });

export const { requireAuth: requireAdminAuth } = createAuthMiddleware<'admin', AdminAuthUser>({
  secret: () => env.opsJwtSecret,
  requestKey: 'admin',
  errorMessages: {
    noToken: '未登录或后台登录已失效。',
    invalidToken: '后台登录状态无效，请重新登录。',
  },
});

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

interface AuthMiddlewareConfig<K extends string, U> {
  /** Returns the JWT secret (lazily — reads env at call time) */
  secret: () => string;
  /** Key on req where the decoded user is attached (e.g. 'user', 'admin') */
  requestKey: K;
  /** Error messages for the two failure modes */
  errorMessages: {
    noToken: string;
    invalidToken: string;
  };
}

interface AuthMiddlewareResult<K extends string, U> {
  requireAuth(req: Request & Record<K, U | undefined>, _res: Response, next: NextFunction): void;
}

function createAuthMiddleware<K extends string, U>(
  config: AuthMiddlewareConfig<K, U>
): AuthMiddlewareResult<K, U> {
  function requireAuth(
    req: Request & Record<K, U | undefined>,
    _res: Response,
    next: NextFunction
  ) {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      next(new HttpError(401, config.errorMessages.noToken));
      return;
    }

    try {
      const token = authorization.slice('Bearer '.length);
      (req as Record<K, U>)[config.requestKey] = jwt.verify(token, config.secret()) as U;
      next();
    } catch {
      next(new HttpError(401, config.errorMessages.invalidToken));
    }
  }

  return { requireAuth };
}
