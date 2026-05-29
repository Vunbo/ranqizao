import bcrypt from 'bcryptjs';
import { type AdminAuthUser, signAdminAuthToken } from '../../../shared/admin-auth';
import { HttpError } from '../../../shared/http';
import { markAdminLogin } from './auth-mutations';
import { getAdminById, getAdminByUsername, type AdminUserRow } from './auth-repository';

function toAdminAuthUser(admin: AdminUserRow): AdminAuthUser {
  return {
    adminId: admin.id,
    username: admin.username,
    displayName: admin.displayName,
    role: admin.role,
  };
}

export async function loginAdmin(input: { username: string; password: string }) {
  const username = String(input.username || '').trim();
  const password = String(input.password || '');

  if (!username || !password) {
    throw new HttpError(400, '用户名和密码不能为空。');
  }

  const admin = await getAdminByUsername(username);
  if (!admin) {
    throw new HttpError(401, '账号或密码错误。');
  }

  if (admin.status !== 'active') {
    throw new HttpError(403, '当前后台账号已被禁用。');
  }

  const matched = await bcrypt.compare(password, admin.passwordHash);
  if (!matched) {
    throw new HttpError(401, '账号或密码错误。');
  }

  await markAdminLogin(admin.id);

  const user = toAdminAuthUser(admin);
  return {
    token: signAdminAuthToken(user),
    user,
  };
}

export async function getCurrentAdmin(adminId: string) {
  const admin = await getAdminById(adminId);

  if (!admin) {
    throw new HttpError(404, '后台账号不存在。');
  }

  if (admin.status !== 'active') {
    throw new HttpError(403, '当前后台账号已被禁用。');
  }

  return {
    adminId: admin.id,
    username: admin.username,
    displayName: admin.displayName,
    role: admin.role,
  };
}
