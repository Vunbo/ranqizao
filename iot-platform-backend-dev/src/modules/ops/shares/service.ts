import { normalizePage, normalizePageSize } from '../common/pagination';
import { paginatedOpsShares } from './share-repository';

export async function listOpsShares(input: {
  page?: unknown;
  pageSize?: unknown;
  search?: unknown;
}) {
  const page = normalizePage(input.page, 1);
  const pageSize = normalizePageSize(input.pageSize, 20);
  const search = String(input.search || '').trim().toLowerCase();

  const result = await paginatedOpsShares(page, pageSize, search);

  return {
    items: result.items.map((row) => ({
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
    pagination: result.pagination,
  };
}
