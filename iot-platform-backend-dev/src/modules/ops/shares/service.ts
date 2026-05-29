import { normalizePage, normalizePageSize } from '../common/pagination';
import { listOpsShareRows } from './share-repository';

export async function listOpsShares(input: {
  page?: unknown;
  pageSize?: unknown;
  search?: unknown;
}) {
  const page = normalizePage(input.page, 1);
  const pageSize = normalizePageSize(input.pageSize, 20);
  const search = String(input.search || '').trim().toLowerCase();

  const filtered = (await listOpsShareRows()).filter((row) => {
    if (!search) {
      return true;
    }

    return (
      String(row.resourceSn || '').toLowerCase().includes(search)
      || row.resourceName.toLowerCase().includes(search)
      || row.ownerUid.toLowerCase().includes(search)
      || row.ownerDisplayName.toLowerCase().includes(search)
      || row.sharedToUid.toLowerCase().includes(search)
      || row.sharedToDisplayName.toLowerCase().includes(search)
    );
  });

  const total = filtered.length;
  const offset = (page - 1) * pageSize;

  return {
    items: filtered.slice(offset, offset + pageSize).map((row) => ({
      id: row.id,
      type: row.type,
      resourceId: row.resourceId,
      resourceSn: row.resourceSn || '',
      resourceName: row.resourceName,
      ownerUid: row.ownerUid,
      ownerDisplayName: row.ownerDisplayName,
      sharedToUid: row.sharedToUid,
      sharedToDisplayName: row.sharedToDisplayName,
      permissions: ['view', 'control'],
      expiry: null,
      createdAt: row.createdAt,
    })),
    pagination: {
      page,
      pageSize,
      total,
    },
  };
}
