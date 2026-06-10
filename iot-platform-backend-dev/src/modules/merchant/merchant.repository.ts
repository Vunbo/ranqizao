import { randomUUID } from 'crypto';
import {
  query,
  type DatabaseExecutor,
} from '../../database/client';
import { MERCHANT_PAGE_KEY, normalizeMerchantPagePayload } from './merchant.content';
import type {
  MerchantApplicationStatus,
  MerchantLevelCode,
  MerchantPagePayload,
  MerchantPageVersionType,
  MerchantProfileStatus,
} from './merchant.types';

export const merchantPoolExecutor: DatabaseExecutor = {
  query,
};

interface MerchantPageVersionRowRaw {
  id: string;
  pageKey: string;
  versionType: MerchantPageVersionType;
  title: string;
  payload: unknown;
  createdBy: string | null;
  createdByName: string | null;
  updatedBy: string | null;
  updatedByName: string | null;
  publishedBy: string | null;
  publishedByName: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantPageVersionRow
  extends Omit<MerchantPageVersionRowRaw, 'payload'> {
  payload: MerchantPagePayload;
}

interface MerchantApplicationRowRaw {
  id: string;
  userPk: string;
  uid: string;
  userDisplayName: string;
  userPhone: string | null;
  userEmail: string | null;
  status: MerchantApplicationStatus;
  levelCode: MerchantLevelCode;
  merchantName: string;
  contactName: string;
  contactPhone: string;
  region: string;
  address: string;
  note: string | null;
  snapshot: unknown;
  reviewComment: string | null;
  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantApplicationRow
  extends Omit<MerchantApplicationRowRaw, 'snapshot'> {
  snapshot: Record<string, unknown> | null;
}

export interface MerchantApplicationEntity {
  id: string;
  userPk: string;
  status: MerchantApplicationStatus;
  levelCode: MerchantLevelCode;
  merchantName: string;
  contactName: string;
  contactPhone: string;
  region: string;
  address: string;
  note: string | null;
  snapshot: Record<string, unknown> | null;
}

export interface MerchantProfileRow {
  id: string;
  applicationId: string;
  userPk: string;
  uid: string;
  userDisplayName: string;
  userPhone: string | null;
  userEmail: string | null;
  merchantName: string;
  contactName: string;
  contactPhone: string;
  levelCode: MerchantLevelCode;
  status: MerchantProfileStatus;
  approvedBy: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const MERCHANT_PAGE_SELECT_SQL = `
  SELECT
    mpc.id,
    mpc.page_key AS "pageKey",
    mpc.version_type AS "versionType",
    mpc.title,
    mpc.payload,
    mpc.created_by AS "createdBy",
    creator.display_name AS "createdByName",
    mpc.updated_by AS "updatedBy",
    updater.display_name AS "updatedByName",
    mpc.published_by AS "publishedBy",
    publisher.display_name AS "publishedByName",
    mpc.published_at AS "publishedAt",
    mpc.created_at AS "createdAt",
    mpc.updated_at AS "updatedAt"
  FROM merchant_page_contents mpc
  LEFT JOIN admin_users creator
    ON creator.id = mpc.created_by
  LEFT JOIN admin_users updater
    ON updater.id = mpc.updated_by
  LEFT JOIN admin_users publisher
    ON publisher.id = mpc.published_by
`;

const MERCHANT_APPLICATION_SELECT_SQL = `
  SELECT
    ma.id,
    ma.user_pk AS "userPk",
    u.short_uid AS "uid",
    u.display_name AS "userDisplayName",
    u.primary_phone AS "userPhone",
    u.primary_email AS "userEmail",
    ma.status,
    ma.level_code AS "levelCode",
    ma.merchant_name AS "merchantName",
    ma.contact_name AS "contactName",
    ma.contact_phone AS "contactPhone",
    ma.region,
    ma.address,
    ma.note,
    ma.snapshot,
    ma.review_comment AS "reviewComment",
    ma.reviewed_by AS "reviewedBy",
    reviewer.display_name AS "reviewedByName",
    ma.reviewed_at AS "reviewedAt",
    ma.created_at AS "createdAt",
    ma.updated_at AS "updatedAt"
  FROM merchant_applications ma
  INNER JOIN users u
    ON u.id = ma.user_pk
  LEFT JOIN admin_users reviewer
    ON reviewer.id = ma.reviewed_by
`;

const MERCHANT_PROFILE_SELECT_SQL = `
  SELECT
    mp.id,
    mp.application_id AS "applicationId",
    mp.user_pk AS "userPk",
    u.short_uid AS "uid",
    u.display_name AS "userDisplayName",
    u.primary_phone AS "userPhone",
    u.primary_email AS "userEmail",
    mp.merchant_name AS "merchantName",
    mp.contact_name AS "contactName",
    mp.contact_phone AS "contactPhone",
    mp.level_code AS "levelCode",
    mp.status,
    mp.approved_by AS "approvedBy",
    approver.display_name AS "approvedByName",
    mp.approved_at AS "approvedAt",
    mp.created_at AS "createdAt",
    mp.updated_at AS "updatedAt"
  FROM merchant_profiles mp
  INNER JOIN users u
    ON u.id = mp.user_pk
  LEFT JOIN admin_users approver
    ON approver.id = mp.approved_by
`;

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function mapMerchantPageRow(row: MerchantPageVersionRowRaw | null) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    payload: normalizeMerchantPagePayload(row.payload),
  } satisfies MerchantPageVersionRow;
}

function mapMerchantApplicationRow(row: MerchantApplicationRowRaw | null) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    snapshot: asRecord(row.snapshot),
  } satisfies MerchantApplicationRow;
}

export async function getMerchantPageVersion(
  versionType: MerchantPageVersionType,
  executor: DatabaseExecutor = merchantPoolExecutor
) {
  const result = await executor.query<MerchantPageVersionRowRaw>(
    `
      ${MERCHANT_PAGE_SELECT_SQL}
      WHERE mpc.page_key = $1
        AND mpc.version_type = $2
      LIMIT 1
    `,
    [MERCHANT_PAGE_KEY, versionType]
  );

  return mapMerchantPageRow(result.rows[0] || null);
}

export async function upsertMerchantPageVersion(
  input: {
    versionType: MerchantPageVersionType;
    title: string;
    payload: MerchantPagePayload;
    actorAdminId: string;
    publishedBy?: string | null;
    publishedAt?: string | null;
  },
  executor: DatabaseExecutor = merchantPoolExecutor
) {
  await executor.query(
    `
      INSERT INTO merchant_page_contents (
        id,
        page_key,
        version_type,
        title,
        payload,
        created_by,
        updated_by,
        published_by,
        published_at
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $6, $7, $8)
      ON CONFLICT (page_key, version_type)
      DO UPDATE SET
        title = EXCLUDED.title,
        payload = EXCLUDED.payload,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW(),
        published_by = COALESCE(EXCLUDED.published_by, merchant_page_contents.published_by),
        published_at = COALESCE(EXCLUDED.published_at, merchant_page_contents.published_at)
    `,
    [
      randomUUID(),
      MERCHANT_PAGE_KEY,
      input.versionType,
      input.title,
      JSON.stringify(input.payload),
      input.actorAdminId,
      input.publishedBy || null,
      input.publishedAt || null,
    ]
  );

  return getMerchantPageVersion(input.versionType, executor);
}

export async function listMerchantApplicationRows() {
  const result = await query<MerchantApplicationRowRaw>(
    `
      ${MERCHANT_APPLICATION_SELECT_SQL}
      ORDER BY
        CASE ma.status
          WHEN 'pending' THEN 0
          WHEN 'approved' THEN 1
          ELSE 2
        END,
        ma.created_at DESC
    `
  );

  return result.rows
    .map((row) => mapMerchantApplicationRow(row))
    .filter(Boolean) as MerchantApplicationRow[];
}

export async function getMerchantApplicationDetailById(
  applicationId: string,
  executor: DatabaseExecutor = merchantPoolExecutor
) {
  const result = await executor.query<MerchantApplicationRowRaw>(
    `
      ${MERCHANT_APPLICATION_SELECT_SQL}
      WHERE ma.id = $1
      LIMIT 1
    `,
    [applicationId]
  );

  return mapMerchantApplicationRow(result.rows[0] || null);
}

export async function getLatestMerchantApplicationByUser(
  userPk: string,
  executor: DatabaseExecutor = merchantPoolExecutor
) {
  const result = await executor.query<MerchantApplicationRowRaw>(
    `
      ${MERCHANT_APPLICATION_SELECT_SQL}
      WHERE ma.user_pk = $1
      ORDER BY ma.created_at DESC
      LIMIT 1
    `,
    [userPk]
  );

  return mapMerchantApplicationRow(result.rows[0] || null);
}

export async function getPendingMerchantApplicationByUser(
  userPk: string,
  executor: DatabaseExecutor = merchantPoolExecutor
) {
  const result = await executor.query<MerchantApplicationRowRaw>(
    `
      ${MERCHANT_APPLICATION_SELECT_SQL}
      WHERE ma.user_pk = $1
        AND ma.status = 'pending'
      ORDER BY ma.created_at DESC
      LIMIT 1
    `,
    [userPk]
  );

  return mapMerchantApplicationRow(result.rows[0] || null);
}

export async function insertMerchantApplication(
  executor: DatabaseExecutor,
  input: {
    userPk: string;
    levelCode: MerchantLevelCode;
    merchantName: string;
    contactName: string;
    contactPhone: string;
    region: string;
    address: string;
    note: string | null;
    snapshot: Record<string, unknown>;
  }
) {
  const applicationId = randomUUID();

  await executor.query(
    `
      INSERT INTO merchant_applications (
        id,
        user_pk,
        status,
        level_code,
        merchant_name,
        contact_name,
        contact_phone,
        region,
        address,
        note,
        snapshot
      )
      VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
    `,
    [
      applicationId,
      input.userPk,
      input.levelCode,
      input.merchantName,
      input.contactName,
      input.contactPhone,
      input.region,
      input.address,
      input.note,
      JSON.stringify(input.snapshot),
    ]
  );

  return getMerchantApplicationDetailById(applicationId, executor);
}

export async function getMerchantApplicationEntityForUpdate(
  applicationId: string,
  executor: DatabaseExecutor
) {
  const result = await executor.query<MerchantApplicationEntity & { snapshot: unknown }>(
    `
      SELECT
        id,
        user_pk AS "userPk",
        status,
        level_code AS "levelCode",
        merchant_name AS "merchantName",
        contact_name AS "contactName",
        contact_phone AS "contactPhone",
        region,
        address,
        note,
        snapshot
      FROM merchant_applications
      WHERE id = $1
      LIMIT 1
      FOR UPDATE
    `,
    [applicationId]
  );

  const row = result.rows[0] || null;

  if (!row) {
    return null;
  }

  return {
    ...row,
    snapshot: asRecord(row.snapshot),
  } satisfies MerchantApplicationEntity;
}

export async function updateMerchantApplicationReview(
  executor: DatabaseExecutor,
  input: {
    applicationId: string;
    status: Extract<MerchantApplicationStatus, 'approved' | 'rejected'>;
    reviewComment: string | null;
    reviewedBy: string;
  }
) {
  await executor.query(
    `
      UPDATE merchant_applications
      SET
        status = $2,
        review_comment = $3,
        reviewed_by = $4,
        reviewed_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
    `,
    [input.applicationId, input.status, input.reviewComment, input.reviewedBy]
  );

  return getMerchantApplicationDetailById(input.applicationId, executor);
}

export async function listMerchantProfileRows() {
  const result = await query<MerchantProfileRow>(
    `
      ${MERCHANT_PROFILE_SELECT_SQL}
      ORDER BY mp.approved_at DESC NULLS LAST, mp.created_at DESC
    `
  );

  return result.rows;
}

export async function getMerchantProfileByUserPk(
  userPk: string,
  executor: DatabaseExecutor = merchantPoolExecutor
) {
  const result = await executor.query<MerchantProfileRow>(
    `
      ${MERCHANT_PROFILE_SELECT_SQL}
      WHERE mp.user_pk = $1
      LIMIT 1
    `,
    [userPk]
  );

  return result.rows[0] || null;
}

export async function upsertMerchantProfileFromApplication(
  executor: DatabaseExecutor,
  input: {
    application: MerchantApplicationEntity;
    adminId: string;
  }
) {
  await executor.query(
    `
      INSERT INTO merchant_profiles (
        id,
        application_id,
        user_pk,
        merchant_name,
        contact_name,
        contact_phone,
        level_code,
        status,
        approved_by,
        approved_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, NOW())
      ON CONFLICT (user_pk)
      DO UPDATE SET
        application_id = EXCLUDED.application_id,
        merchant_name = EXCLUDED.merchant_name,
        contact_name = EXCLUDED.contact_name,
        contact_phone = EXCLUDED.contact_phone,
        level_code = EXCLUDED.level_code,
        status = 'active',
        approved_by = EXCLUDED.approved_by,
        approved_at = EXCLUDED.approved_at,
        updated_at = NOW()
    `,
    [
      randomUUID(),
      input.application.id,
      input.application.userPk,
      input.application.merchantName,
      input.application.contactName,
      input.application.contactPhone,
      input.application.levelCode,
      input.adminId,
    ]
  );

  return getMerchantProfileByUserPk(input.application.userPk, executor);
}
