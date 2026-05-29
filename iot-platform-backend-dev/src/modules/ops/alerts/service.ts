import { type AdminAuthUser } from '../../../shared/admin-auth';
import { normalizePage, normalizePageSize } from '../common/pagination';
import {
  markOpsAlertFalsePositiveByAdmin,
  resolveOpsAlertByAdmin,
} from './alert-mutations';
import { listOpsAlertRows } from './alert-repository';

export async function listOpsAlerts(input: {
  page?: unknown;
  pageSize?: unknown;
  search?: unknown;
  level?: unknown;
  status?: unknown;
}) {
  const page = normalizePage(input.page, 1);
  const pageSize = normalizePageSize(input.pageSize, 20);
  const search = String(input.search || '').trim().toLowerCase();
  const level = String(input.level || '').trim();
  const status = String(input.status || '').trim();

  const filtered = (await listOpsAlertRows()).filter((row) => {
    const matchesSearch = !search
      || row.deviceSn.toLowerCase().includes(search)
      || row.message.toLowerCase().includes(search)
      || row.title.toLowerCase().includes(search);
    const matchesLevel = !level || row.level === level;
    const matchesStatus = !status || row.status === status;
    return matchesSearch && matchesLevel && matchesStatus;
  });

  const total = filtered.length;
  const offset = (page - 1) * pageSize;

  return {
    items: filtered.slice(offset, offset + pageSize).map((row) => ({
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
