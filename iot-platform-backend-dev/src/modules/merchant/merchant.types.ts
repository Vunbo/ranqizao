export type MerchantPageVersionType = 'draft' | 'published';

export type MerchantApplicationStatus = 'pending' | 'approved' | 'rejected';

export type MerchantProfileStatus = 'active' | 'disabled';

export type MerchantLevelCode = 'operations_center' | 'district_agent';

export interface MerchantPageCard {
  id: string;
  title: string;
  badge: string;
  items: string[];
  note: string;
}

export interface MerchantPageContact {
  title: string;
  phone: string;
  wechat: string;
  address: string;
  note: string;
}

export interface MerchantPagePayload {
  pageTitle: string;
  pageSubtitle: string;
  applyNotice: string;
  cards: MerchantPageCard[];
  contact: MerchantPageContact;
}
