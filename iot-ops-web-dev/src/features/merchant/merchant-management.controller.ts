import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type {
  MerchantPagePayload,
  OpsMerchantApplicationDetailResponse,
  OpsMerchantApplicationItem,
  OpsMerchantPageResponse,
  OpsMerchantProfileItem,
} from '../../types';
import {
  cloneMerchantPayload,
  createEmptyMerchantPagePayload,
  type MerchantTabId,
} from './merchant.helpers';

export function useMerchantManagementController() {
  const [activeTab, setActiveTab] = useState<MerchantTabId>('content');
  const [pageData, setPageData] = useState<OpsMerchantPageResponse>({
    draft: null,
    published: null,
  });
  const [draftPayload, setDraftPayload] = useState<MerchantPagePayload>(
    createEmptyMerchantPagePayload()
  );
  const [pageLoading, setPageLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [applicationSearch, setApplicationSearch] = useState('');
  const [applicationStatus, setApplicationStatus] = useState('');
  const [applications, setApplications] = useState<OpsMerchantApplicationItem[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState('');
  const [selectedApplication, setSelectedApplication] =
    useState<OpsMerchantApplicationDetailResponse | null>(null);
  const [applicationDetailLoading, setApplicationDetailLoading] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewingStatus, setReviewingStatus] = useState('');
  const [profileSearch, setProfileSearch] = useState('');
  const [profileStatus, setProfileStatus] = useState('');
  const [profiles, setProfiles] = useState<OpsMerchantProfileItem[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSuccessMessage('');
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const loadPage = async () => {
    setPageLoading(true);
    setError('');
    try {
      const result = await api.get<OpsMerchantPageResponse>('/ops/merchant/page');
      setPageData(result);
      setDraftPayload(
        cloneMerchantPayload(result.draft?.payload || result.published?.payload)
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '页面内容加载失败');
    } finally {
      setPageLoading(false);
    }
  };

  const loadApplicationDetail = async (applicationId: string) => {
    if (!applicationId) {
      return;
    }

    setApplicationDetailLoading(true);
    setError('');
    try {
      const result = await api.get<OpsMerchantApplicationDetailResponse>(
        `/ops/merchant/applications/${applicationId}`
      );
      setSelectedApplication(result);
      setReviewComment(result.application.reviewComment || '');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '申请详情加载失败');
    } finally {
      setApplicationDetailLoading(false);
    }
  };

  const loadApplications = async (preferredId = '') => {
    setApplicationsLoading(true);
    setError('');
    try {
      const query = new URLSearchParams();
      query.set('page', '1');
      query.set('pageSize', '100');
      if (applicationSearch.trim()) {
        query.set('search', applicationSearch.trim());
      }
      if (applicationStatus) {
        query.set('status', applicationStatus);
      }

      const result = await api.get<{ items: OpsMerchantApplicationItem[] }>(
        `/ops/merchant/applications?${query.toString()}`
      );
      const nextItems = result.items || [];
      setApplications(nextItems);

      const nextSelectedId =
        preferredId
        || (nextItems.some((item) => item.id === selectedApplicationId)
          ? selectedApplicationId
          : nextItems[0]?.id || '');

      setSelectedApplicationId(nextSelectedId);

      if (nextSelectedId) {
        await loadApplicationDetail(nextSelectedId);
      } else {
        setSelectedApplication(null);
        setReviewComment('');
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '入驻申请加载失败');
    } finally {
      setApplicationsLoading(false);
    }
  };

  const loadProfiles = async () => {
    setProfilesLoading(true);
    setError('');
    try {
      const query = new URLSearchParams();
      query.set('page', '1');
      query.set('pageSize', '100');
      if (profileSearch.trim()) {
        query.set('search', profileSearch.trim());
      }
      if (profileStatus) {
        query.set('status', profileStatus);
      }

      const result = await api.get<{ items: OpsMerchantProfileItem[] }>(
        `/ops/merchant/profiles?${query.toString()}`
      );
      setProfiles(result.items || []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '商户列表加载失败');
    } finally {
      setProfilesLoading(false);
    }
  };

  useEffect(() => {
    void loadPage();
  }, []);

  useEffect(() => {
    if (activeTab === 'applications') {
      void loadApplications();
    }
  }, [activeTab, applicationSearch, applicationStatus]);

  useEffect(() => {
    if (activeTab === 'profiles') {
      void loadProfiles();
    }
  }, [activeTab, profileSearch, profileStatus]);

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    setError('');
    try {
      const result = await api.put<{ page: OpsMerchantPageResponse['draft'] }>(
        '/ops/merchant/page/draft',
        draftPayload
      );
      setPageData((prev) => ({
        ...prev,
        draft: result.page,
      }));
      setDraftPayload(cloneMerchantPayload(result.page?.payload));
      setSuccessMessage('草稿已保存');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '草稿保存失败');
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setError('');
    try {
      const result = await api.post<{ page: OpsMerchantPageResponse['published'] }>(
        '/ops/merchant/page/publish'
      );
      setPageData((prev) => ({
        ...prev,
        published: result.page,
      }));
      setSuccessMessage('内容已发布');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '内容发布失败');
    } finally {
      setPublishing(false);
    }
  };

  const handleSelectApplication = async (applicationId: string) => {
    setSelectedApplicationId(applicationId);
    await loadApplicationDetail(applicationId);
  };

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!selectedApplicationId) {
      return;
    }

    setReviewingStatus(status);
    setError('');
    try {
      const result = await api.post<OpsMerchantApplicationDetailResponse>(
        `/ops/merchant/applications/${selectedApplicationId}/review`,
        {
          status,
          reviewComment,
        }
      );

      setSelectedApplication(result);
      setSuccessMessage(status === 'approved' ? '申请已通过' : '申请已驳回');
      await Promise.all([
        loadApplications(selectedApplicationId),
        loadProfiles(),
      ]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '申请审核失败');
    } finally {
      setReviewingStatus('');
    }
  };

  return {
    activeTab,
    pageData,
    draftPayload,
    pageLoading,
    savingDraft,
    publishing,
    applicationSearch,
    applicationStatus,
    applications,
    applicationsLoading,
    selectedApplicationId,
    selectedApplication,
    applicationDetailLoading,
    reviewComment,
    reviewingStatus,
    profileSearch,
    profileStatus,
    profiles,
    profilesLoading,
    error,
    successMessage,
    setActiveTab,
    setDraftPayload,
    setApplicationSearch,
    setApplicationStatus,
    setReviewComment,
    setProfileSearch,
    setProfileStatus,
    handleSaveDraft,
    handlePublish,
    handleSelectApplication,
    handleReview,
  };
}
