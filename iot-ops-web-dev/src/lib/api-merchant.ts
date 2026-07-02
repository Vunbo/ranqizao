import { api } from './api';

export interface MerchantPageCard {
  id: string;
  icon: string;
  title: string;
  badge: string;
  description: string;
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

export interface OpsMerchantPageVersion {
  id: string;
  title: string;
  versionType: 'draft' | 'published';
  payload: MerchantPagePayload;
  createdByName: string | null;
  updatedByName: string | null;
  publishedByName: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

export interface OpsMerchantPageResponse {
  draft: OpsMerchantPageVersion | null;
  published: OpsMerchantPageVersion | null;
}

export interface OpsMerchantApplicationItem {
  id: string;
  applicantName: string;
  companyName: string;
  level: string;
  status: string;
  createdAt: string;
}

export interface OpsMerchantApplicationDetailResponse {
  application: {
    id: string;
    applicantName: string;
    companyName: string;
    contactPhone: string;
    level: string;
    status: string;
    snapshot: MerchantPagePayload | null;
    reviewComment: string | null;
    reviewedBy: string | null;
    createdAt: string;
  };
  applicant: {
    uid: string;
    displayName: string;
    phone: string;
  };
}

export interface OpsMerchantProfileItem {
  id: string;
  uid: string;
  companyName: string;
  level: string;
  status: string;
  displayName: string;
  shortUid: string;
}

export const merchantApi = {
  getPage(): Promise<OpsMerchantPageResponse> {
    return api.get<OpsMerchantPageResponse>('/ops/merchant/page');
  },

  saveDraft(payload: MerchantPagePayload): Promise<{ page: OpsMerchantPageResponse['draft'] }> {
    return api.put('/ops/merchant/page/draft', payload);
  },

  publish(): Promise<{ page: OpsMerchantPageResponse['published'] }> {
    return api.post('/ops/merchant/page/publish');
  },

  listApplications(filters: { search?: string; status?: string }): Promise<{ items: OpsMerchantApplicationItem[] }> {
    const query = new URLSearchParams();
    query.set('page', '1');
    query.set('pageSize', '100');
    if (filters.search) query.set('search', filters.search);
    if (filters.status) query.set('status', filters.status);
    return api.get(`/ops/merchant/applications?${query.toString()}`);
  },

  applicationDetail(id: string): Promise<OpsMerchantApplicationDetailResponse> {
    return api.get<OpsMerchantApplicationDetailResponse>(`/ops/merchant/applications/${id}`);
  },

  reviewApplication(id: string, status: string, comment: string): Promise<OpsMerchantApplicationDetailResponse> {
    return api.post(`/ops/merchant/applications/${id}/review`, { status, reviewComment: comment });
  },

  listProfiles(filters: { search?: string; status?: string }): Promise<{ items: OpsMerchantProfileItem[] }> {
    const query = new URLSearchParams();
    query.set('page', '1');
    query.set('pageSize', '100');
    if (filters.search) query.set('search', filters.search);
    if (filters.status) query.set('status', filters.status);
    return api.get(`/ops/merchant/profiles?${query.toString()}`);
  },
};
