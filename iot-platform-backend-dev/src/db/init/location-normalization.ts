import { Pool } from 'pg';
import {
  deriveLocationRegionPath,
  normalizeLocationForStorage,
} from '../../shared/location';
import { stableStringify } from './helpers';

export async function normalizeDeviceLocations(mainPool: Pool) {
  const result = await mainPool.query<{
    id: string;
    location: unknown;
    regionPath: string | null;
  }>(
    `
      SELECT
        id,
        location,
        region_path AS "regionPath"
      FROM devices
      WHERE location IS NOT NULL
         OR region_path IS NOT NULL
    `
  );

  for (const row of result.rows) {
    const normalizedLocation = normalizeLocationForStorage(row.location);
    const nextRegionPath = normalizedLocation
      ? deriveLocationRegionPath(normalizedLocation, { includeDistrict: true })
      : null;

    if (
      stableStringify(row.location) === stableStringify(normalizedLocation) &&
      row.regionPath === nextRegionPath
    ) {
      continue;
    }

    await mainPool.query(
      `
        UPDATE devices
        SET
          location = $2::jsonb,
          region_path = $3
        WHERE id = $1
      `,
      [row.id, JSON.stringify(normalizedLocation), nextRegionPath]
    );
  }
}
