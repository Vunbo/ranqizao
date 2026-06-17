export const MALL_PAGE_KEY = 'mall_home';

export interface MallPagePayload {
  pageTitle: string;
  pageSubtitle: string;
  banners: Array<{ id: string; imageUrl: string; linkUrl: string; title: string }>;
  categories: Array<{ id: string; name: string; icon: string }>;
  featuredProducts: string[];
  notice: string;
}

export function createEmptyMallPagePayload(): MallPagePayload {
  return {
    pageTitle: '',
    pageSubtitle: '',
    banners: [],
    categories: [],
    featuredProducts: [],
    notice: '',
  };
}
