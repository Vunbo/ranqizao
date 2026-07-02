import { query } from '../../../db/client';

export async function markAdminLogin(adminId: string) {
  await query(
    'UPDATE admin_users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1',
    [adminId]
  );
}
