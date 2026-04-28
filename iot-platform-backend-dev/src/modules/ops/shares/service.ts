import { query } from '../../../database/client';

function normalizePage(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export async function listOpsShares(input: {
  page?: unknown;
  pageSize?: unknown;
  search?: unknown;
}) {
  const page = normalizePage(input.page, 1);
  const pageSize = Math.min(normalizePage(input.pageSize, 20), 100);
  const search = String(input.search || '').trim().toLowerCase();

  const result = await query<{
    id: string;
    type: string;
    resourceId: string;
    resourceSn: string | null;
    resourceName: string;
    ownerUid: string;
    ownerDisplayName: string;
    sharedToUid: string;
    sharedToDisplayName: string;
    createdAt: string;
  }>(
    `
      SELECT
        ds.device_id || '-' || ds.user_id AS id,
        'device_share' AS type,
        d.id AS "resourceId",
        COALESCE(d.serial_number, di.serial_number) AS "resourceSn",
        d.name AS "resourceName",
        owner_user.short_uid AS "ownerUid",
        owner_user.display_name AS "ownerDisplayName",
        target_user.short_uid AS "sharedToUid",
        target_user.display_name AS "sharedToDisplayName",
        ds.created_at AS "createdAt"
      FROM device_shares ds
      INNER JOIN devices d
        ON d.id = ds.device_id
      INNER JOIN users owner_user
        ON owner_user.short_uid = d.owner_id
      INNER JOIN users target_user
        ON target_user.short_uid = ds.user_id
      LEFT JOIN device_inventory di
        ON di.id = d.inventory_id
      ORDER BY ds.created_at DESC
    `
  );

  const filtered = result.rows.filter((row) => {
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
