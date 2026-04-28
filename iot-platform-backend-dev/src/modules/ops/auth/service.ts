import bcrypt from 'bcryptjs';
import { query } from '../../../database/client';
import { type AdminAuthUser, signAdminAuthToken } from '../../../shared/admin-auth';
import { HttpError } from '../../../shared/http';

interface AdminUserRow {
  id: string;
  username: string;
  displayName: string;
  role: 'super_admin' | 'ops_admin' | 'ops_viewer';
  status: 'active' | 'disabled';
  passwordHash: string;
}

function toAdminAuthUser(admin: AdminUserRow): AdminAuthUser {
  return {
    adminId: admin.id,
    username: admin.username,
    displayName: admin.displayName,
    role: admin.role,
  };
}

async function getAdminByUsername(username: string) {
  const result = await query<AdminUserRow>(
    `
      SELECT
        id,
        username,
        display_name AS "displayName",
        role,
        status,
        password_hash AS "passwordHash"
      FROM admin_users
      WHERE username = $1
      LIMIT 1
    `,
    [String(username || '').trim()]
  );

  return result.rows[0] || null;
}

async function getAdminById(adminId: string) {
  const result = await query<Omit<AdminUserRow, 'passwordHash'>>(
    `
      SELECT
        id,
        username,
        display_name AS "displayName",
        role,
        status
      FROM admin_users
      WHERE id = $1
      LIMIT 1
    `,
    [adminId]
  );

  return result.rows[0] || null;
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

  await query(
    'UPDATE admin_users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1',
    [admin.id]
  );

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
