import { withTransaction } from '../../db/client';
import { HttpError } from '../../shared/http';
import { getUserById } from '../auth/auth.repository';
import {
  isMerchantLevelCode,
  MERCHANT_LEVEL_LABELS,
} from './merchant.content';
import {
  getLatestMerchantApplicationByUser,
  getMerchantApplicationDetailById,
  getMerchantPageVersion,
  getMerchantProfileByUserPk,
  getPendingMerchantApplicationByUser,
  insertMerchantApplication,
} from './merchant.repository';
import type {
  MerchantApplicationRow,
  MerchantPageVersionRow,
  MerchantProfileRow,
} from './merchant.repository';

function readRequiredText(value: unknown, fieldLabel: string) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new HttpError(400, `${fieldLabel}不能为空。`);
  }

  return normalized;
}

function mapPage(page: MerchantPageVersionRow) {
  return {
    id: page.id,
    pageKey: page.pageKey,
    versionType: page.versionType,
    title: page.title || page.payload.pageTitle,
    payload: page.payload,
    publishedAt: page.publishedAt,
    updatedAt: page.updatedAt,
  };
}

function mapApplicationSummary(application: MerchantApplicationRow | null) {
  if (!application) {
    return null;
  }

  return {
    id: application.id,
    status: application.status,
    levelCode: application.levelCode,
    levelLabel: MERCHANT_LEVEL_LABELS[application.levelCode],
    merchantName: application.merchantName,
    contactName: application.contactName,
    contactPhone: application.contactPhone,
    region: application.region,
    address: application.address,
    note: application.note,
    reviewComment: application.reviewComment,
    reviewedAt: application.reviewedAt,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
}

function mapMerchantProfile(profile: MerchantProfileRow | null) {
  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    applicationId: profile.applicationId,
    status: profile.status,
    levelCode: profile.levelCode,
    levelLabel: MERCHANT_LEVEL_LABELS[profile.levelCode],
    merchantName: profile.merchantName,
    contactName: profile.contactName,
    contactPhone: profile.contactPhone,
    approvedAt: profile.approvedAt,
    updatedAt: profile.updatedAt,
  };
}

export async function getMerchantLandingPage() {
  const publishedPage =
    (await getMerchantPageVersion('published'))
    || (await getMerchantPageVersion('draft'));

  if (!publishedPage) {
    return null;
  }

  return mapPage(publishedPage);
}

export async function getMerchantSummary(userPk: string) {
  const [profile, latestApplication] = await Promise.all([
    getMerchantProfileByUserPk(userPk),
    getLatestMerchantApplicationByUser(userPk),
  ]);

  const hasActiveProfile = profile?.status === 'active';
  const hasPendingApplication = latestApplication?.status === 'pending';

  return {
    profile: mapMerchantProfile(profile),
    latestApplication: mapApplicationSummary(latestApplication),
    canApply: !hasActiveProfile && !hasPendingApplication,
    canEnterPanel: hasActiveProfile,
  };
}

export async function submitMerchantApplication(input: {
  userPk: string;
  levelCode: unknown;
  merchantName: unknown;
  contactName: unknown;
  contactPhone: unknown;
  region: unknown;
  address: unknown;
  note?: unknown;
}) {
  const levelCode = String(input.levelCode || '').trim();

  if (!isMerchantLevelCode(levelCode)) {
    throw new HttpError(400, '入驻级别不合法。');
  }

  const merchantName = readRequiredText(input.merchantName, '商户名称');
  const contactName = readRequiredText(input.contactName, '联系人');
  const contactPhone = readRequiredText(input.contactPhone, '联系电话');
  const region = readRequiredText(input.region, '所在区域');
  const address = readRequiredText(input.address, '联系地址');
  const note = String(input.note || '').trim() || null;

  const user = await getUserById(input.userPk);

  if (!user) {
    throw new HttpError(404, '用户不存在。');
  }

  const [profile, pendingApplication] = await Promise.all([
    getMerchantProfileByUserPk(input.userPk),
    getPendingMerchantApplicationByUser(input.userPk),
  ]);

  if (profile?.status === 'active') {
    throw new HttpError(409, '当前账号已通过入驻审核。');
  }

  if (pendingApplication) {
    throw new HttpError(409, '当前账号已有待审核的入驻申请。');
  }

  const application = await withTransaction(async (executor) => {
    return insertMerchantApplication(executor, {
      userPk: input.userPk,
      levelCode,
      merchantName,
      contactName,
      contactPhone,
      region,
      address,
      note,
      snapshot: {
        user: {
          userId: user.id,
          uid: user.short_uid,
          displayName: user.display_name,
          phone: user.primary_phone,
          email: user.primary_email,
        },
        application: {
          levelCode,
          levelLabel: MERCHANT_LEVEL_LABELS[levelCode],
          merchantName,
          contactName,
          contactPhone,
          region,
          address,
          note,
        },
        submittedAt: new Date().toISOString(),
      },
    });
  });

  return {
    application: mapApplicationSummary(application),
  };
}

export async function getMerchantPanel(userPk: string) {
  const profile = await getMerchantProfileByUserPk(userPk);

  if (!profile || profile.status !== 'active') {
    throw new HttpError(403, '当前账号尚未开通商户面板。');
  }

  const application = await getMerchantApplicationDetailById(profile.applicationId);

  return {
    profile: mapMerchantProfile(profile),
    approvedApplication: mapApplicationSummary(application),
  };
}
