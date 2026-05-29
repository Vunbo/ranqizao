import { query } from '../../../database/client';

export interface AdminUserRow {
  id: string;
  username: string;
  displayName: string;
  role: 'super_admin' | 'ops_admin' | 'ops_viewer';
  status: 'active' | 'disabled';
  passwordHash: string;
}

export interface AdminProfileRow {
  id: string;
  username: string;
  displayName: string;
  role: 'super_admin' | 'ops_admin' | 'ops_viewer';
  status: 'active' | 'disabled';
}

export async function getAdminByUsername(username: string) {
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

export async function getAdminById(adminId: string) {
  const result = await query<AdminProfileRow>(
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
