import type { MerchantPagePayload } from '../../types';

export const MERCHANT_TABS = [
  { id: 'content', label: '内容发布' },
  { id: 'applications', label: '入驻审核' },
  { id: 'profiles', label: '商户列表' },
] as const;

export type MerchantTabId = (typeof MERCHANT_TABS)[number]['id'];

export const MERCHANT_STATUS_LABELS = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  active: '已启用',
  disabled: '已停用',
} as const;

export function createEmptyMerchantPagePayload(): MerchantPagePayload {
  return {
    pageTitle: '',
    pageSubtitle: '',
    applyNotice: '',
    cards: [],
    contact: {
      title: '',
      phone: '',
      wechat: '',
      address: '',
      note: '',
    },
  };
}

export function cloneMerchantPayload(
  payload: MerchantPagePayload | null | undefined
): MerchantPagePayload {
  return JSON.parse(
    JSON.stringify(payload || createEmptyMerchantPagePayload())
  ) as MerchantPagePayload;
}

export function formatMerchantStatus(status: string) {
  return MERCHANT_STATUS_LABELS[status as keyof typeof MERCHANT_STATUS_LABELS] || status;
}
