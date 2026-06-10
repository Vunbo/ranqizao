<template>
  <view class="merchant-view">
    <view class="merchant-view__header">
      <view class="merchant-view__header-main">
        <view class="merchant-view__back" @tap="$emit('back')">
          <app-icon name="arrowLeft" :size="18" color="#475569" />
        </view>
        <view>
          <text class="merchant-view__title">推广 / 入驻</text>
          <text class="merchant-view__subtitle">合作方案与商户入驻申请</text>
        </view>
      </view>
      <view
        class="merchant-view__refresh"
        :class="{ 'merchant-view__refresh--disabled': isLoading || isRefreshing }"
        @tap="reload"
      >
        <app-icon name="loader" :size="14" color="#64748b" :animated="isRefreshing" />
        <text class="merchant-view__refresh-text">
          {{ isRefreshing ? '刷新中' : '刷新内容' }}
        </text>
      </view>
    </view>

    <view v-if="isLoading" class="merchant-view__loading">
      <app-icon name="loader" :size="30" color="#f97316" animated />
    </view>

    <view v-else class="merchant-view__content">
      <card-box v-if="hasHeroContent" custom-style="padding:20px;">
        <text class="merchant-view__hero-title">{{ pageTitle }}</text>
        <text v-if="pageSubtitle" class="merchant-view__hero-subtitle">{{ pageSubtitle }}</text>
        <text v-if="applyNotice" class="merchant-view__hero-note">{{ applyNotice }}</text>
      </card-box>

      <card-box :custom-style="hasHeroContent ? 'padding:18px; margin-top:16px;' : 'padding:18px;'">
        <view class="merchant-view__status-row">
          <view>
            <text class="merchant-view__section-title">当前状态</text>
            <text class="merchant-view__section-note">{{ applicationStatusDesc }}</text>
          </view>
          <view class="merchant-view__status-pill">
            <text class="merchant-view__status-pill-text">{{ applicationStatusText }}</text>
          </view>
        </view>
      </card-box>

      <card-box
        v-for="card in cards"
        :key="card.id"
        custom-style="padding:18px; margin-top:16px;"
      >
        <view v-if="card.title || card.badge" class="merchant-view__card-head">
          <text class="merchant-view__section-title">{{ card.title }}</text>
          <view v-if="card.badge" class="merchant-view__badge">
            <text class="merchant-view__badge-text">{{ card.badge }}</text>
          </view>
        </view>
        <view class="merchant-view__list">
          <view
            v-for="(item, index) in card.items"
            :key="`${card.id}-${index}`"
            class="merchant-view__list-item"
          >
            <view class="merchant-view__dot"></view>
            <text class="merchant-view__list-text">{{ item }}</text>
          </view>
        </view>
        <text v-if="card.note" class="merchant-view__card-note">{{ card.note }}</text>
      </card-box>

      <card-box custom-style="padding:18px; margin-top:16px; margin-bottom:24px;">
        <text class="merchant-view__section-title">快捷操作</text>
        <view class="merchant-view__actions">
          <view class="merchant-view__action merchant-view__action--ghost" @tap="openContact">
            <app-icon name="phone" :size="18" color="#10b981" />
            <text class="merchant-view__action-text">联系我们</text>
          </view>
          <view
            class="merchant-view__action merchant-view__action--primary"
            :class="{ 'merchant-view__action--disabled': applyDisabled }"
            @tap="openApply"
          >
            <app-icon name="plus" :size="18" :color="applyDisabled ? '#cbd5e1' : '#ffffff'" />
            <text
              class="merchant-view__action-text merchant-view__action-text--light"
              :class="{ 'merchant-view__action-text--muted': applyDisabled }"
            >
              {{ applyButtonText }}
            </text>
          </view>
        </view>
      </card-box>
    </view>

    <view v-if="isContactOpen" class="modal-mask" @tap="closeContact">
      <view class="merchant-view__modal" @tap.stop>
        <text v-if="contact.title" class="merchant-view__modal-title">{{ contact.title }}</text>
        <view v-if="contactEntries.length" class="merchant-view__contact-list">
          <view v-for="item in contactEntries" :key="item.label" class="merchant-view__contact-item">
            <text class="merchant-view__contact-label">{{ item.label }}</text>
            <text class="merchant-view__contact-value">{{ item.value }}</text>
          </view>
        </view>
        <view class="merchant-view__modal-actions merchant-view__modal-actions--single">
          <view class="merchant-view__modal-primary" @tap="closeContact">
            <text class="merchant-view__modal-primary-text">关闭</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="isApplyOpen" class="modal-mask" @tap="closeApply()">
      <view class="merchant-view__modal merchant-view__modal--form" @tap.stop>
        <text class="merchant-view__modal-title">申请入驻</text>
        <text class="merchant-view__modal-desc">请完善商户信息，提交后由平台审核。</text>

        <view class="merchant-view__field-group">
          <text class="merchant-view__field-label">入驻级别</text>
          <view class="merchant-view__level-list">
            <view
              v-for="item in levelOptions"
              :key="item.value"
              class="merchant-view__level-item"
              :class="{ 'merchant-view__level-item--active': form.levelCode === item.value }"
              @tap="updateLevelCode(item.value)"
            >
              <text
                class="merchant-view__level-text"
                :class="{ 'merchant-view__level-text--active': form.levelCode === item.value }"
              >
                {{ item.label }}
              </text>
            </view>
          </view>
        </view>

        <view class="merchant-view__field-group">
          <text class="merchant-view__field-label">商户名称</text>
          <view class="merchant-view__input">
            <input
              v-model="form.merchantName"
              class="merchant-view__input-core"
              placeholder="请输入商户名称"
              placeholder-style="color:#94a3b8"
            />
          </view>
        </view>

        <view class="merchant-view__field-group">
          <text class="merchant-view__field-label">联系人</text>
          <view class="merchant-view__input">
            <input
              v-model="form.contactName"
              class="merchant-view__input-core"
              placeholder="请输入联系人"
              placeholder-style="color:#94a3b8"
            />
          </view>
        </view>

        <view class="merchant-view__field-group">
          <text class="merchant-view__field-label">联系电话</text>
          <view class="merchant-view__input">
            <input
              v-model="form.contactPhone"
              class="merchant-view__input-core"
              placeholder="请输入联系电话"
              placeholder-style="color:#94a3b8"
            />
          </view>
        </view>

        <view class="merchant-view__field-group">
          <text class="merchant-view__field-label">所在区域</text>
          <view class="merchant-view__input">
            <input
              v-model="form.region"
              class="merchant-view__input-core"
              placeholder="如：上海市闵行区"
              placeholder-style="color:#94a3b8"
            />
          </view>
        </view>

        <view class="merchant-view__field-group">
          <text class="merchant-view__field-label">联系地址</text>
          <view class="merchant-view__input">
            <input
              v-model="form.address"
              class="merchant-view__input-core"
              placeholder="请输入联系地址"
              placeholder-style="color:#94a3b8"
            />
          </view>
        </view>

        <view class="merchant-view__field-group">
          <text class="merchant-view__field-label">补充说明</text>
          <view class="merchant-view__textarea">
            <textarea
              v-model="form.note"
              class="merchant-view__textarea-core"
              maxlength="200"
              placeholder="选填，可填写合作说明"
              placeholder-style="color:#94a3b8"
            />
          </view>
        </view>

        <view class="merchant-view__modal-actions">
          <view class="merchant-view__modal-ghost" @tap="closeApply()">
            <text class="merchant-view__modal-ghost-text">取消</text>
          </view>
          <view class="merchant-view__modal-primary" @tap="submit">
            <text class="merchant-view__modal-primary-text">
              {{ isSubmitting ? '提交中...' : '提交申请' }}
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import AppIcon from '../ui/AppIcon.vue'
import CardBox from '../ui/CardBox.vue'
import { useMerchantLandingController } from '../../services/features/merchant/merchant-landing-controller'

const emit = defineEmits(['back', 'toast'])

const {
  isLoading,
  isRefreshing,
  isSubmitting,
  isContactOpen,
  isApplyOpen,
  pageTitle,
  pageSubtitle,
  applyNotice,
  hasHeroContent,
  cards,
  contact,
  contactEntries,
  applyButtonText,
  applyDisabled,
  applicationStatusText,
  applicationStatusDesc,
  levelOptions,
  form,
  openContact,
  closeContact,
  openApply,
  closeApply,
  updateLevelCode,
  submit,
  reload,
} = useMerchantLandingController({
  notify: (payload) => emit('toast', payload),
})
</script>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.42);
}

.merchant-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.merchant-view__header-main {
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
}

.merchant-view__back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-right: 12px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.merchant-view__refresh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 38px;
  padding: 0 14px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.merchant-view__refresh--disabled {
  opacity: 0.72;
}

.merchant-view__refresh-text {
  margin-left: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.merchant-view__title {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.merchant-view__subtitle {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
}

.merchant-view__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
}

.merchant-view__hero-title,
.merchant-view__section-title {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.merchant-view__hero-subtitle,
.merchant-view__section-note,
.merchant-view__hero-note {
  display: block;
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.7;
  color: #64748b;
}

.merchant-view__status-row,
.merchant-view__card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.merchant-view__status-pill,
.merchant-view__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 76px;
  height: 32px;
  padding: 0 12px;
  background: #fff7ed;
  border-radius: 999px;
}

.merchant-view__status-pill-text,
.merchant-view__badge-text {
  font-size: 12px;
  font-weight: 700;
  color: #f97316;
}

.merchant-view__list {
  margin-top: 14px;
}

.merchant-view__list-item {
  display: flex;
  align-items: flex-start;
  margin-top: 10px;
}

.merchant-view__dot {
  width: 6px;
  height: 6px;
  margin-top: 8px;
  margin-right: 10px;
  background: #f97316;
  border-radius: 50%;
}

.merchant-view__list-text,
.merchant-view__card-note,
.merchant-view__contact-value {
  flex: 1;
  font-size: 13px;
  line-height: 1.7;
  color: #475569;
}

.merchant-view__card-note {
  display: block;
  margin-top: 12px;
  color: #f97316;
}

.merchant-view__actions {
  margin-top: 14px;
}

.merchant-view__action {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  margin-top: 12px;
  border-radius: 18px;
}

.merchant-view__action--ghost {
  background: #f8fafc;
}

.merchant-view__action--primary {
  background: #f97316;
}

.merchant-view__action--disabled {
  background: #e2e8f0;
}

.merchant-view__action-text {
  margin-left: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.merchant-view__action-text--light {
  color: #ffffff;
}

.merchant-view__action-text--muted {
  color: #94a3b8;
}

.merchant-view__modal {
  width: 100%;
  max-width: 640rpx;
  padding: 24px;
  background: #ffffff;
  border-radius: 28px;
}

.merchant-view__modal--form {
  max-height: 80vh;
  overflow-y: auto;
}

.merchant-view__modal-title {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.merchant-view__modal-desc {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.7;
  color: #64748b;
}

.merchant-view__contact-list,
.merchant-view__field-group {
  margin-top: 16px;
}

.merchant-view__contact-item {
  margin-top: 12px;
}

.merchant-view__contact-label,
.merchant-view__field-label {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 700;
  color: #334155;
}

.merchant-view__level-list {
  display: flex;
  gap: 10px;
}

.merchant-view__level-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 42px;
  background: #f8fafc;
  border-radius: 16px;
}

.merchant-view__level-item--active {
  background: #fff7ed;
}

.merchant-view__level-text {
  font-size: 13px;
  font-weight: 700;
  color: #64748b;
}

.merchant-view__level-text--active {
  color: #f97316;
}

.merchant-view__input,
.merchant-view__textarea {
  padding: 0 14px;
  background: #f8fafc;
  border-radius: 16px;
}

.merchant-view__input-core {
  width: 100%;
  height: 44px;
  font-size: 14px;
  color: #0f172a;
}

.merchant-view__textarea-core {
  width: 100%;
  min-height: 100px;
  padding: 12px 0;
  font-size: 14px;
  line-height: 1.6;
  color: #0f172a;
}

.merchant-view__modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 22px;
}

.merchant-view__modal-actions--single {
  justify-content: flex-end;
}

.merchant-view__modal-ghost,
.merchant-view__modal-primary {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  border-radius: 16px;
}

.merchant-view__modal-ghost {
  background: #f8fafc;
}

.merchant-view__modal-primary {
  background: #f97316;
}

.merchant-view__modal-ghost-text {
  font-size: 14px;
  font-weight: 700;
  color: #334155;
}

.merchant-view__modal-primary-text {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
}
</style>
