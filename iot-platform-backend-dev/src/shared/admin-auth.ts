import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { HttpError } from './http';

export interface AdminAuthUser {
  adminId: string;
  username: string;
  displayName: string;
  role: 'super_admin' | 'ops_admin' | 'ops_viewer';
}

export interface AdminAuthenticatedRequest extends Request {
  admin?: AdminAuthUser;
}

export function signAdminAuthToken(user: AdminAuthUser) {
  return jwt.sign(user, env.opsJwtSecret, { expiresIn: '7d' });
}

export function requireAdminAuth(
  req: AdminAuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    next(new HttpError(401, '未登录或后台登录已失效。'));
    return;
  }

  try {
    const token = authorization.slice('Bearer '.length);
    req.admin = jwt.verify(token, env.opsJwtSecret) as AdminAuthUser;
    next();
  } catch {
    next(new HttpError(401, '后台登录状态无效，请重新登录。'));
  }
}
