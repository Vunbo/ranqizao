import { query } from '../../../database/client';

export interface OpsShareRow {
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
}

export async function listOpsShareRows() {
  const result = await query<OpsShareRow>(
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

  return result.rows;
}
