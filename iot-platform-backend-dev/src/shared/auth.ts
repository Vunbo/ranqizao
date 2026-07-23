import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { HttpError } from './http';

export interface AuthUser {
  userId: string;
  uid: string;
  email: string;
  phone: string;
  displayName: string;
  photoURL: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function signAuthToken(user: AuthUser) {
  return jwt.sign(user, env.jwtSecret, { expiresIn: '7d' });
}

export function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    next(new HttpError(401, '未登录或登录已失效。'));
    return;
  }

  try {
    const token = authorization.slice('Bearer '.length);
    req.user = jwt.verify(token, env.jwtSecret) as AuthUser;
    next();
  } catch {
    next(new HttpError(401, '登录状态无效，请重新登录。'));
  }
}