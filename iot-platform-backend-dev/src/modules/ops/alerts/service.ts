import { type AdminAuthUser } from '../../../shared/admin-auth';
import { normalizePage, normalizePageSize, normaliseFilterValue } from '../_internal/pagination';
import {
  markOpsAlertFalsePositiveByAdmin,
  resolveOpsAlertByAdmin,
} from './alert-mutations';
import { countOpsAlertRows, listOpsAlertRows } from './alert-repository';

export async function listOpsAlerts(input: {
  page?: unknown;
  pageSize?: unknown;
  search?: unknown;
  level?: unknown;
  status?: unknown;
}) {
  const page = normalizePage(input.page, 1);
  const pageSize = normalizePageSize(input.pageSize, 20);
  const search = normaliseFilterValue(input.search);
  const level = normaliseFilterValue(input.level);
  const status = normaliseFilterValue(input.status);

  const filters = { search, level, status };
  const [items, total] = await Promise.all([
    listOpsAlertRows(filters, { page, pageSize }),
    countOpsAlertRows(filters),
  ]);

  return {
    items: items.map((row) => ({
      ...row,
      handlerName: row.handlerName || '-',
    })),
    pagination: {
      page,
      pageSize,
      total,
    },
  };
}

export async function resolveOpsAlert(
  alertId: string,
  admin: AdminAuthUser,
  comment: string
) {
  return resolveOpsAlertByAdmin(alertId, admin, comment);
}

export async function markOpsAlertFalsePositive(
  alertId: string,
  admin: AdminAuthUser,
  comment: string
) {
  return markOpsAlertFalsePositiveByAdmin(alertId, admin, comment);
}
