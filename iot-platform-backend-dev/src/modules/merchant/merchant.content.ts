import type {
  MerchantLevelCode,
  MerchantPageCard,
  MerchantPageContact,
  MerchantPagePayload,
} from './merchant.types';

export const MERCHANT_PAGE_KEY = 'merchant_settlement';

export const MERCHANT_LEVEL_LABELS: Record<MerchantLevelCode, string> = {
  operations_center: '运营中心',
  district_agent: '区代理',
};

export const MERCHANT_LEVEL_CODES = Object.keys(
  MERCHANT_LEVEL_LABELS
) as MerchantLevelCode[];

function createEmptyCard(index: number): MerchantPageCard {
  return {
    id: `card-${index + 1}`,
    title: '',
    badge: '',
    items: [],
    note: '',
  };
}

function createEmptyContact(): MerchantPageContact {
  return {
    title: '',
    phone: '',
    wechat: '',
    address: '',
    note: '',
  };
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string') {
      const normalized = value.trim();
      if (normalized) {
        return normalized;
      }
    }
  }

  return '';
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function normalizeCard(
  value: unknown,
  index: number,
): MerchantPageCard {
  const record = asRecord(value);
  const fallback = createEmptyCard(index);

  if (!record) {
    return {
      ...fallback,
      items: [],
    };
  }

  const items = normalizeStringArray(record.items);

  return {
    id: readString(record.id) || fallback.id,
    title: readString(record.title),
    badge: readString(record.badge),
    items,
    note: readString(record.note),
  };
}

function normalizeContact(value: unknown): MerchantPageContact {
  const record = asRecord(value);
  const fallback = createEmptyContact();

  if (!record) {
    return { ...fallback };
  }

  return {
    title: readString(record.title),
    phone: readString(record.phone),
    wechat: readString(record.wechat),
    address: readString(record.address),
    note: readString(record.note),
  };
}

export function createEmptyMerchantPagePayload(): MerchantPagePayload {
  return {
    pageTitle: '',
    pageSubtitle: '',
    applyNotice: '',
    cards: [],
    contact: createEmptyContact(),
  };
}

export function normalizeMerchantPagePayload(value: unknown): MerchantPagePayload {
  const fallback = createEmptyMerchantPagePayload();
  const record = asRecord(value);

  if (!record) {
    return fallback;
  }

  const cardsInput = Array.isArray(record.cards) ? record.cards : [];
  const cards: MerchantPageCard[] = [];

  for (let index = 0; index < cardsInput.length; index += 1) {
    const nextCard = normalizeCard(cardsInput[index], index);

    if (nextCard.id) {
      cards.push(nextCard);
    }
  }

  return {
    pageTitle: readString(record.pageTitle, record.title),
    pageSubtitle: readString(record.pageSubtitle, record.subtitle),
    applyNotice: readString(record.applyNotice),
    cards,
    contact: normalizeContact(record.contact),
  };
}

export function isMerchantLevelCode(value: string): value is MerchantLevelCode {
  return MERCHANT_LEVEL_CODES.includes(value as MerchantLevelCode);
}
