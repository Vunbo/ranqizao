import { query } from '../../../database/client';
import { type AdminAuthUser } from '../../../shared/admin-auth';
import { HttpError } from '../../../shared/http';

export async function resolveOpsAlertByAdmin(
  alertId: string,
  admin: AdminAuthUser,
  comment: string
) {
  const result = await query(
    `
      UPDATE alerts
      SET
        status = 'resolved',
        is_false_positive = FALSE,
        handler_admin_id = $2,
        handler_comment = $3,
        resolved_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `,
    [alertId, admin.adminId, comment || null]
  );

  if (!result.rowCount) {
    throw new HttpError(404, '告警不存在。');
  }

  return { ok: true };
}

export async function markOpsAlertFalsePositiveByAdmin(
  alertId: string,
  admin: AdminAuthUser,
  comment: string
) {
  const result = await query(
    `
      UPDATE alerts
      SET
        status = 'false_positive',
        is_false_positive = TRUE,
        handler_admin_id = $2,
        handler_comment = $3,
        resolved_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `,
    [alertId, admin.adminId, comment || null]
  );

  if (!result.rowCount) {
    throw new HttpError(404, '告警不存在。');
  }

  return { ok: true };
}
