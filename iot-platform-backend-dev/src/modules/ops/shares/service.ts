import { normalizePage, normalizePageSize, normaliseFilterValue } from '../_internal/pagination';
import { countOpsShareRows, listOpsShareRows } from './share-repository';

export async function listOpsShares(input: {
  page?: unknown;
  pageSize?: unknown;
  search?: unknown;
}) {
  const page = normalizePage(input.page, 1);
  const pageSize = normalizePageSize(input.pageSize, 20);
  const search = normaliseFilterValue(input.search);

  const filters = { search };
  const [items, total] = await Promise.all([
    listOpsShareRows(filters, { page, pageSize }),
    countOpsShareRows(filters),
  ]);

  return {
    items: items.map((row) => ({
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
