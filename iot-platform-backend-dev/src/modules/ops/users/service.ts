import { HttpError } from '../../../shared/http';
import { mapDeviceRowToView } from '../common/device-view';
import { normalizePage, normalizePageSize } from '../common/pagination';
import {
  getOpsUserRow,
  listBoundDeviceRowsForUser,
  paginatedOpsUsers,
  listSharedDeviceRowsForUser,
} from './user-repository';

export async function listOpsUsers(input: {
  page?: unknown;
  pageSize?: unknown;
  search?: unknown;
  status?: unknown;
}) {
  const page = normalizePage(input.page, 1);
  const pageSize = normalizePageSize(input.pageSize, 20);
  const search = String(input.search || '').trim().toLowerCase();
  const status = String(input.status || '').trim();

  const result = await paginatedOpsUsers(page, pageSize, search, status);

  return {
    items: result.items.map((row) => ({
      userId: row.userId,
      uid: row.uid,
      displayName: row.displayName,
      phone: row.phone,
      email: row.email,
      status: row.status,
      bindCount: Number(row.bindCount || 0),
      shareCount: Number(row.shareCount || 0),
      lastLoginAt: row.lastLoginAt,
    })),
    pagination: result.pagination,
  };
}

export async function getOpsUser(uid: string) {
  const user = await getOpsUserRow(uid);
  if (!user) {
    throw new HttpError(404, '用户不存在。');
  }

  const [boundDevices, sharedDevices] = await Promise.all([
    listBoundDeviceRowsForUser(uid),
    listSharedDeviceRowsForUser(uid),
  ]);

  return {
    user,
    boundDevices: boundDevices.map((row) => mapDeviceRowToView(row)),
    sharedDevices: sharedDevices.map((row) => ({
      id: row.id,
      sn: row.sn || '',
      name: row.name,
      model: row.model || '',
      ownerUid: row.ownerUid,
      ownerDisplayName: row.ownerDisplayName,
      permissions: ['view', 'control'],
      createdAt: row.createdAt,
    })),
  };
}
