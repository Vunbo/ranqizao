import type { AdminAuthUser } from '../../../shared/admin-auth';
import { withTransaction } from '../../../db/client';
import { HttpError } from '../../../shared/http';
import { normalizePage, normalizePageSize } from '../_internal/pagination';
import {
  MERCHANT_LEVEL_LABELS,
  normalizeMerchantPagePayload,
} from '../../merchant/merchant.content';
import {
  getMerchantApplicationDetailById,
  getMerchantApplicationEntityForUpdate,
  getMerchantPageVersion,
  getMerchantProfileByUserPk,
  listMerchantApplicationRows,
  listMerchantProfileRows,
  updateMerchantApplicationReview,
  upsertMerchantPageVersion,
  upsertMerchantProfileFromApplication,
} from '../../merchant/merchant.repository';

function normalizeText(value: unknown) {
  return String(value || '').trim();
}

function containsSearch(value: string, search: string) {
  return value.toLowerCase().includes(search);
}

function mapOpsPage(page: Awaited<ReturnType<typeof getMerchantPageVersion>>) {
  if (!page) {
    return null;
  }

  return {
    id: page.id,
    title: page.title || page.payload.pageTitle,
    versionType: page.versionType,
    payload: page.payload,
    createdByName: page.createdByName,
    updatedByName: page.updatedByName,
    publishedByName: page.publishedByName,
    publishedAt: page.publishedAt,
    updatedAt: page.updatedAt,
  };
}

function mapApplication(application: NonNullable<Awaited<ReturnType<typeof getMerchantApplicationDetailById>>>) {
  return {
    id: application.id,
    userPk: application.userPk,
    uid: application.uid,
    userDisplayName: application.userDisplayName,
    userPhone: application.userPhone,
    userEmail: application.userEmail,
    status: application.status,
    levelCode: application.levelCode,
    levelLabel: MERCHANT_LEVEL_LABELS[application.levelCode],
    merchantName: application.merchantName,
    contactName: application.contactName,
    contactPhone: application.contactPhone,
    region: application.region,
    address: application.address,
    note: application.note,
    snapshot: application.snapshot,
    reviewComment: application.reviewComment,
    reviewedByName: application.reviewedByName,
    reviewedAt: application.reviewedAt,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
}

function mapProfile(profile: NonNullable<Awaited<ReturnType<typeof getMerchantProfileByUserPk>>>) {
  return {
    id: profile.id,
    applicationId: profile.applicationId,
    userPk: profile.userPk,
    uid: profile.uid,
    userDisplayName: profile.userDisplayName,
    userPhone: profile.userPhone,
    userEmail: profile.userEmail,
    merchantName: profile.merchantName,
    contactName: profile.contactName,
    contactPhone: profile.contactPhone,
    levelCode: profile.levelCode,
    levelLabel: MERCHANT_LEVEL_LABELS[profile.levelCode],
    status: profile.status,
    approvedByName: profile.approvedByName,
    approvedAt: profile.approvedAt,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

export async function getOpsMerchantPage() {
  const [draft, published] = await Promise.all([
    getMerchantPageVersion('draft'),
    getMerchantPageVersion('published'),
  ]);

  return {
    draft: mapOpsPage(draft),
    published: mapOpsPage(published),
  };
}

export async function saveOpsMerchantDraft(
  body: unknown,
  admin: AdminAuthUser
) {
  const payload = normalizeMerchantPagePayload(body);
  const page = await upsertMerchantPageVersion({
    versionType: 'draft',
    title: payload.pageTitle,
    payload,
    actorAdminId: admin.adminId,
  });

  if (!page) {
    throw new HttpError(500, '草稿保存失败。');
  }

  return {
    page: mapOpsPage(page),
  };
}

export async function publishOpsMerchantPage(admin: AdminAuthUser) {
  const draft = await getMerchantPageVersion('draft');

  if (!draft) {
    throw new HttpError(404, '请先保存推广/入驻草稿。');
  }

  const page = await upsertMerchantPageVersion({
    versionType: 'published',
    title: draft.title || draft.payload.pageTitle,
    payload: draft.payload,
    actorAdminId: admin.adminId,
    publishedBy: admin.adminId,
    publishedAt: new Date().toISOString(),
  });

  if (!page) {
    throw new HttpError(500, '内容发布失败。');
  }

  return {
    page: mapOpsPage(page),
  };
}

export async function listOpsMerchantApplications(input: {
  page?: unknown;
  pageSize?: unknown;
  search?: unknown;
  status?: unknown;
}) {
  const page = normalizePage(input.page, 1);
  const pageSize = normalizePageSize(input.pageSize, 20);
  const search = normalizeText(input.search).toLowerCase();
  const status = normalizeText(input.status);

  const rows = await listMerchantApplicationRows();

  const filtered = rows.filter((row) => {
    const matchesSearch =
      !search
      || containsSearch(row.uid, search)
      || containsSearch(row.userDisplayName, search)
      || containsSearch(row.merchantName, search)
      || containsSearch(row.contactName, search)
      || containsSearch(row.contactPhone, search)
      || containsSearch(row.region, search);
    const matchesStatus = !status || row.status === status;

    return matchesSearch && matchesStatus;
  });

  const offset = (page - 1) * pageSize;

  return {
    items: filtered.slice(offset, offset + pageSize).map(mapApplication),
    pagination: {
      page,
      pageSize,
      total: filtered.length,
    },
  };
}

export async function getOpsMerchantApplication(applicationId: string) {
  const application = await getMerchantApplicationDetailById(applicationId);

  if (!application) {
    throw new HttpError(404, '入驻申请不存在。');
  }

  const profile = await getMerchantProfileByUserPk(application.userPk);

  return {
    application: mapApplication(application),
    profile: profile ? mapProfile(profile) : null,
  };
}

export async function reviewOpsMerchantApplication(
  input: {
    applicationId: string;
    status: unknown;
    reviewComment?: unknown;
  },
  admin: AdminAuthUser
) {
  const status = normalizeText(input.status);
  const reviewComment = normalizeText(input.reviewComment) || null;

  if (status !== 'approved' && status !== 'rejected') {
    throw new HttpError(400, '审核结果不合法。');
  }

  return withTransaction(async (executor) => {
    const application = await getMerchantApplicationEntityForUpdate(
      input.applicationId,
      executor
    );

    if (!application) {
      throw new HttpError(404, '入驻申请不存在。');
    }

    if (application.status !== 'pending') {
      throw new HttpError(409, '该入驻申请已完成审核。');
    }

    if (status === 'approved') {
      await upsertMerchantProfileFromApplication(executor, {
        application,
        adminId: admin.adminId,
      });
    }

    const reviewedApplication = await updateMerchantApplicationReview(executor, {
      applicationId: input.applicationId,
      status,
      reviewComment,
      reviewedBy: admin.adminId,
    });

    const profile = await getMerchantProfileByUserPk(application.userPk, executor);

    if (!reviewedApplication) {
      throw new HttpError(500, '审核结果保存失败。');
    }

    return {
      application: mapApplication(reviewedApplication),
      profile: status === 'approved' && profile ? mapProfile(profile) : null,
    };
  });
}

export async function listOpsMerchantProfiles(input: {
  page?: unknown;
  pageSize?: unknown;
  search?: unknown;
  status?: unknown;
}) {
  const page = normalizePage(input.page, 1);
  const pageSize = normalizePageSize(input.pageSize, 20);
  const search = normalizeText(input.search).toLowerCase();
  const status = normalizeText(input.status);

  const rows = await listMerchantProfileRows();

  const filtered = rows.filter((row) => {
    const matchesSearch =
      !search
      || containsSearch(row.uid, search)
      || containsSearch(row.userDisplayName, search)
      || containsSearch(row.merchantName, search)
      || containsSearch(row.contactName, search)
      || containsSearch(row.contactPhone, search);
    const matchesStatus = !status || row.status === status;

    return matchesSearch && matchesStatus;
  });

  const offset = (page - 1) * pageSize;

  return {
    items: filtered.slice(offset, offset + pageSize).map(mapProfile),
    pagination: {
      page,
      pageSize,
      total: filtered.length,
    },
  };
}
