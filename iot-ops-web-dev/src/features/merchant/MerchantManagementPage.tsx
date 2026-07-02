import {
  BadgeCheck,
  ClipboardList,
  Megaphone,
  Save,
  Search,
  Send,
  Store,
} from 'lucide-react';
import { formatTime } from '../../common/time';
import { MerchantContentEditor } from './MerchantContentEditor';
import { MerchantFilterSelect } from './MerchantFilterSelect';
import {
  formatMerchantStatus,
  MERCHANT_TABS,
} from './merchant.helpers';
import { useMerchantManagementController } from './merchant-management.controller';

function getStatusClass(status: string) {
  if (status === 'approved' || status === 'active') {
    return 'bg-success/10 text-success border-success/20';
  }

  if (status === 'pending') {
    return 'bg-warning/10 text-warning border-warning/20';
  }

  return 'bg-danger/10 text-danger border-danger/20';
}

export const MerchantManagement = () => {
  const {
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
  } = useMerchantManagementController();

  return (
    <div className="p-10 space-y-8">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-2xl font-display font-black text-text-primary tracking-widest uppercase">
            推广 / 入驻
          </h2>
          <p className="text-text-secondary text-[10px] font-mono font-bold mt-1 tracking-[0.2em]">
            页面内容发布、入驻审核与商户档案统一管理
          </p>
        </div>

        <div className="flex bg-black/40 p-1 rounded-xl border border-border-subtle">
          {MERCHANT_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2 rounded-lg text-[10px] font-mono font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-brand text-black brand-glow'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="glass-dark rounded-2xl border border-danger/30 bg-danger/5 p-4 text-[10px] font-mono text-danger uppercase tracking-widest">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="glass-dark rounded-2xl border border-success/30 bg-success/5 p-4 text-[10px] font-mono text-success uppercase tracking-widest">
          {successMessage}
        </div>
      )}

      {activeTab === 'content' && (
        <div className="grid grid-cols-1 2xl:grid-cols-[1fr_360px] gap-8">
          <div className="glass-dark rounded-3xl border border-border-subtle p-8 space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-brand/10 flex items-center justify-center">
                  <Megaphone className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-text-primary tracking-widest uppercase">
                    页面草稿
                  </h3>
                  <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                    App 端推广 / 入驻页展示内容
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveDraft}
                  disabled={pageLoading || savingDraft}
                  className="inline-flex items-center gap-2 rounded-xl border border-brand/40 px-5 py-2 text-[10px] font-mono font-bold text-brand transition-all hover:bg-brand/10 disabled:opacity-50"
                >
                  <Save className={`w-4 h-4 ${savingDraft ? 'animate-spin' : ''}`} />
                  {savingDraft ? '保存中...' : '保存草稿'}
                </button>
                <button
                  onClick={handlePublish}
                  disabled={pageLoading || publishing}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2 text-[10px] font-mono font-bold text-black transition-all hover:bg-brand/80 disabled:opacity-50"
                >
                  <Send className={`w-4 h-4 ${publishing ? 'animate-spin' : ''}`} />
                  {publishing ? '发布中...' : '发布到 App'}
                </button>
              </div>
            </div>

            {pageLoading ? (
              <div className="py-20 text-center text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                正在加载页面内容...
              </div>
            ) : (
              <MerchantContentEditor
                payload={draftPayload}
                onChange={setDraftPayload}
              />
            )}
          </div>

          <div className="space-y-6">
            <div className="glass-dark rounded-3xl border border-border-subtle p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-success/10 flex items-center justify-center">
                  <BadgeCheck className="w-5 h-5 text-success" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-text-primary tracking-widest uppercase">
                    已发布版本
                  </h3>
                  <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                    App 端当前生效内容
                  </p>
                </div>
              </div>

              {pageData.published ? (
                <div className="space-y-3 text-sm text-text-secondary">
                  <div className="rounded-2xl border border-border-subtle bg-white/5 px-4 py-3">
                    <div className="text-text-primary font-bold">{pageData.published.title}</div>
                    <div className="text-[10px] font-mono mt-2 uppercase tracking-widest">
                      发布时间: {formatTime(pageData.published.publishedAt)}
                    </div>
                    <div className="text-[10px] font-mono mt-1 uppercase tracking-widest">
                      发布人: {pageData.published.publishedByName || '-'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border-subtle bg-white/5 px-4 py-3">
                    <div className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                      页面副标题
                    </div>
                    <div className="mt-2 text-text-primary">
                      {pageData.published.payload.pageSubtitle}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                  暂无已发布版本
                </div>
              )}
            </div>

            <div className="glass-dark rounded-3xl border border-border-subtle p-6 space-y-3">
              <div className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">
                草稿状态
              </div>
              <div className="rounded-2xl border border-border-subtle bg-white/5 px-4 py-3">
                <div className="text-text-primary font-bold">
                  {pageData.draft?.title || draftPayload.pageTitle}
                </div>
                <div className="text-[10px] font-mono mt-2 uppercase tracking-widest text-text-secondary">
                  最近更新: {formatTime(pageData.draft?.updatedAt || null)}
                </div>
                <div className="text-[10px] font-mono mt-1 uppercase tracking-widest text-text-secondary">
                  更新人: {pageData.draft?.updatedByName || '-'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'applications' && (
        <div className="grid grid-cols-1 2xl:grid-cols-[360px_1fr] gap-8">
          <div className="glass-dark rounded-3xl border border-border-subtle p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-warning/10 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h3 className="text-sm font-display font-bold text-text-primary tracking-widest uppercase">
                  申请列表
                </h3>
                <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                  {applications.length} 条记录
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input
                  type="text"
                  placeholder="搜索 UID / 商户 / 联系人"
                  value={applicationSearch}
                  onChange={(event) => setApplicationSearch(event.target.value)}
                  className="w-full rounded-2xl border border-border-subtle bg-black/30 py-3 pl-10 pr-4 text-sm text-text-primary outline-none focus:border-brand/50"
                />
              </div>
              <MerchantFilterSelect
                value={applicationStatus}
                onChange={(event) => setApplicationStatus(event.target.value)}
              >
                <option value="">全部状态</option>
                <option value="pending">待审核</option>
                <option value="approved">已通过</option>
                <option value="rejected">已驳回</option>
              </MerchantFilterSelect>
            </div>

            <div className="space-y-3 max-h-[720px] overflow-y-auto custom-scrollbar pr-1">
              {applicationsLoading ? (
                <div className="py-16 text-center text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                  正在加载申请列表...
                </div>
              ) : applications.length > 0 ? (
                applications.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectApplication(item.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition-all ${
                      selectedApplicationId === item.id
                        ? 'border-brand/50 bg-brand/5 brand-glow'
                        : 'border-border-subtle bg-white/5 hover:border-brand/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-text-primary">
                          {item.merchantName}
                        </div>
                        <div className="mt-1 text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                          {item.userDisplayName} / {item.uid}
                        </div>
                      </div>
                      <span
                        className={`rounded-lg border px-2 py-1 text-[9px] font-mono font-bold uppercase tracking-widest ${getStatusClass(item.status)}`}
                      >
                        {formatMerchantStatus(item.status)}
                      </span>
                    </div>
                    <div className="mt-3 text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                      {item.levelLabel} · {formatTime(item.createdAt)}
                    </div>
                  </button>
                ))
              ) : (
                <div className="py-16 text-center text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                  暂无符合条件的申请
                </div>
              )}
            </div>
          </div>

          <div className="glass-dark rounded-3xl border border-border-subtle p-8">
            {applicationDetailLoading ? (
              <div className="py-24 text-center text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                正在加载申请详情...
              </div>
            ) : selectedApplication ? (
              <div className="space-y-8">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-display font-black text-text-primary tracking-widest uppercase">
                        {selectedApplication.application.merchantName}
                      </h3>
                      <span
                        className={`rounded-lg border px-3 py-1 text-[9px] font-mono font-bold uppercase tracking-widest ${getStatusClass(selectedApplication.application.status)}`}
                      >
                        {formatMerchantStatus(selectedApplication.application.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                      申请人: {selectedApplication.application.userDisplayName} / {selectedApplication.application.uid}
                    </p>
                  </div>

                  <div className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                    提交时间: {formatTime(selectedApplication.application.createdAt)}
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {[
                    ['申请级别', selectedApplication.application.levelLabel],
                    ['联系人', selectedApplication.application.contactName],
                    ['联系电话', selectedApplication.application.contactPhone],
                    ['所在区域', selectedApplication.application.region],
                    ['联系地址', selectedApplication.application.address],
                    ['用户邮箱', selectedApplication.application.userEmail || '-'],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-border-subtle bg-white/5 px-4 py-4"
                    >
                      <div className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                        {label}
                      </div>
                      <div className="mt-2 text-sm text-text-primary">{value}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-border-subtle bg-white/5 px-4 py-4">
                    <div className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                      补充说明
                    </div>
                    <div className="mt-2 text-sm text-text-primary whitespace-pre-wrap">
                      {selectedApplication.application.note || '无'}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border-subtle bg-white/5 px-4 py-4">
                    <div className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                      审核记录
                    </div>
                    <div className="mt-2 space-y-2 text-sm text-text-primary">
                      <div>审核人: {selectedApplication.application.reviewedByName || '-'}</div>
                      <div>审核时间: {formatTime(selectedApplication.application.reviewedAt)}</div>
                      <div className="whitespace-pre-wrap">
                        备注: {selectedApplication.application.reviewComment || '无'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border-subtle bg-white/5 px-4 py-4">
                  <div className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                    提交快照
                  </div>
                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-[11px] text-text-primary leading-6">
                    {JSON.stringify(selectedApplication.application.snapshot || {}, null, 2)}
                  </pre>
                </div>

                {selectedApplication.profile && (
                  <div className="rounded-2xl border border-success/20 bg-success/5 px-4 py-4">
                    <div className="text-[10px] font-mono text-success uppercase tracking-widest">
                      已生成商户档案
                    </div>
                    <div className="mt-2 text-sm text-text-primary">
                      {selectedApplication.profile.merchantName} / {selectedApplication.profile.levelLabel}
                    </div>
                  </div>
                )}

                <div className="rounded-3xl border border-border-subtle bg-black/20 p-6 space-y-4">
                  <div>
                    <h4 className="text-sm font-display font-bold text-text-primary tracking-widest uppercase">
                      审核操作
                    </h4>
                    <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                      通过后会自动为当前用户开通商户面板
                    </p>
                  </div>

                  <textarea
                    value={reviewComment}
                    onChange={(event) => setReviewComment(event.target.value)}
                    rows={4}
                    disabled={selectedApplication.application.status !== 'pending'}
                    placeholder="填写审核备注，可选"
                    className="w-full rounded-2xl border border-border-subtle bg-black/30 px-4 py-3 text-sm text-text-primary outline-none focus:border-brand/50 disabled:opacity-60"
                  />

                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={() => handleReview('approved')}
                      disabled={
                        reviewingStatus !== '' || selectedApplication.application.status !== 'pending'
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-success px-6 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-white transition-all hover:bg-success/80 disabled:opacity-50"
                    >
                      {reviewingStatus === 'approved' ? '审核中...' : '审核通过'}
                    </button>
                    <button
                      onClick={() => handleReview('rejected')}
                      disabled={
                        reviewingStatus !== '' || selectedApplication.application.status !== 'pending'
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-danger px-6 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-white transition-all hover:bg-danger/80 disabled:opacity-50"
                    >
                      {reviewingStatus === 'rejected' ? '审核中...' : '驳回申请'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-24 text-center text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                请选择左侧申请记录查看详情
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'profiles' && (
        <div className="glass-dark rounded-3xl border border-border-subtle p-8 space-y-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-brand/10 flex items-center justify-center">
                <Store className="w-5 h-5 text-brand" />
              </div>
              <div>
                <h3 className="text-sm font-display font-bold text-text-primary tracking-widest uppercase">
                  商户档案
                </h3>
                <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                  审核通过后进入这里
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 xl:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input
                  type="text"
                  placeholder="搜索 UID / 商户 / 联系人"
                  value={profileSearch}
                  onChange={(event) => setProfileSearch(event.target.value)}
                  className="w-full xl:w-72 rounded-2xl border border-border-subtle bg-black/30 py-3 pl-10 pr-4 text-sm text-text-primary outline-none focus:border-brand/50"
                />
              </div>
              <MerchantFilterSelect
                value={profileStatus}
                onChange={(event) => setProfileStatus(event.target.value)}
                wrapperClassName="xl:w-48"
              >
                <option value="">全部状态</option>
                <option value="active">已启用</option>
                <option value="disabled">已停用</option>
              </MerchantFilterSelect>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-subtle bg-white/5">
                  <th className="px-5 py-4 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">
                    商户
                  </th>
                  <th className="px-5 py-4 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">
                    联系方式
                  </th>
                  <th className="px-5 py-4 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">
                    级别
                  </th>
                  <th className="px-5 py-4 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">
                    状态
                  </th>
                  <th className="px-5 py-4 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">
                    审批信息
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {profilesLoading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-20 text-center text-[10px] font-mono text-text-secondary uppercase tracking-widest"
                    >
                      正在加载商户列表...
                    </td>
                  </tr>
                ) : profiles.length > 0 ? (
                  profiles.map((item) => (
                    <tr key={item.id} className="hover:bg-brand/5 transition-all">
                      <td className="px-5 py-5">
                        <div className="text-sm font-bold text-text-primary">
                          {item.merchantName}
                        </div>
                        <div className="mt-1 text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                          {item.userDisplayName} / {item.uid}
                        </div>
                      </td>
                      <td className="px-5 py-5 text-sm text-text-primary">
                        <div>{item.contactName}</div>
                        <div className="mt-1 text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                          {item.contactPhone}
                        </div>
                        <div className="mt-1 text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                          {item.userEmail || '-'}
                        </div>
                      </td>
                      <td className="px-5 py-5 text-sm text-text-primary">
                        {item.levelLabel}
                      </td>
                      <td className="px-5 py-5">
                        <span
                          className={`rounded-lg border px-3 py-1 text-[9px] font-mono font-bold uppercase tracking-widest ${getStatusClass(item.status)}`}
                        >
                          {formatMerchantStatus(item.status)}
                        </span>
                      </td>
                      <td className="px-5 py-5 text-sm text-text-primary">
                        <div>{item.approvedByName || '-'}</div>
                        <div className="mt-1 text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                          {formatTime(item.approvedAt)}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-20 text-center text-[10px] font-mono text-text-secondary uppercase tracking-widest"
                    >
                      暂无符合条件的商户档案
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
