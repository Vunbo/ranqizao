<template>
  <view class="merchant-panel">
    <view class="merchant-panel__header">
      <view class="merchant-panel__back" @tap="$emit('back')">
        <app-icon name="arrowLeft" :size="18" color="#475569" />
      </view>
      <view>
        <text class="merchant-panel__title">商户面板</text>
        <text class="merchant-panel__subtitle">查看当前商户信息与申请结果</text>
      </view>
    </view>

    <view v-if="isLoading" class="merchant-panel__loading">
      <app-icon name="loader" :size="30" color="#f97316" animated />
    </view>

    <view v-else class="merchant-panel__content">
      <card-box custom-style="padding:18px;">
        <view class="merchant-panel__hero">
          <view>
            <text class="merchant-panel__section-title">
              {{ profile ? profile.merchantName : '商户信息' }}
            </text>
            <text class="merchant-panel__section-note">
              {{
                profile
                  ? `${profile.levelLabel} · ${profile.status === 'active' ? '已启用' : profile.status}`
                  : '暂无商户档案'
              }}
            </text>
          </view>
          <view class="merchant-panel__badge">
            <text class="merchant-panel__badge-text">{{ profile ? '已开通' : '未开通' }}</text>
          </view>
        </view>
      </card-box>

      <card-box v-if="profile" custom-style="padding:18px; margin-top:16px;">
        <text class="merchant-panel__section-title">商户档案</text>
        <view class="merchant-panel__info-list">
          <view class="merchant-panel__info-item">
            <text class="merchant-panel__info-label">联系人</text>
            <text class="merchant-panel__info-value">{{ profile.contactName }}</text>
          </view>
          <view class="merchant-panel__info-item">
            <text class="merchant-panel__info-label">联系电话</text>
            <text class="merchant-panel__info-value">{{ profile.contactPhone }}</text>
          </view>
          <view class="merchant-panel__info-item">
            <text class="merchant-panel__info-label">申请级别</text>
            <text class="merchant-panel__info-value">{{ profile.levelLabel }}</text>
          </view>
          <view class="merchant-panel__info-item">
            <text class="merchant-panel__info-label">通过时间</text>
            <text class="merchant-panel__info-value">{{ profile.approvedAt || '-' }}</text>
          </view>
        </view>
      </card-box>

      <card-box v-if="approvedApplication" custom-style="padding:18px; margin-top:16px;">
        <text class="merchant-panel__section-title">申请详情</text>
        <view class="merchant-panel__info-list">
          <view class="merchant-panel__info-item">
            <text class="merchant-panel__info-label">所在区域</text>
            <text class="merchant-panel__info-value">{{ approvedApplication.region || '-' }}</text>
          </view>
          <view class="merchant-panel__info-item">
            <text class="merchant-panel__info-label">联系地址</text>
            <text class="merchant-panel__info-value">{{ approvedApplication.address || '-' }}</text>
          </view>
          <view class="merchant-panel__info-item">
            <text class="merchant-panel__info-label">审核备注</text>
            <text class="merchant-panel__info-value">{{ approvedApplication.reviewComment || '-' }}</text>
          </view>
        </view>
      </card-box>
    </view>
  </view>
</template>

<script setup>
import AppIcon from '../ui/AppIcon.vue'
import CardBox from '../ui/CardBox.vue'
import { useMerchantPanelController } from '../../services/features/merchant/merchant-panel-controller'

const emit = defineEmits(['back', 'toast'])

const {
  isLoading,
  profile,
  approvedApplication,
} = useMerchantPanelController({
  notify: (payload) => emit('toast', payload),
})
</script>

<style scoped>
.merchant-panel__header {
  display: flex;
  align-items: center;
  margin-bottom: 18px;
}

.merchant-panel__back {
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

.merchant-panel__title {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.merchant-panel__subtitle {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
}

.merchant-panel__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
}

.merchant-panel__hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.merchant-panel__section-title {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.merchant-panel__section-note {
  display: block;
  margin-top: 8px;
  font-size: 13px;
  color: #64748b;
}

.merchant-panel__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 80px;
  height: 32px;
  padding: 0 14px;
  background: #fff7ed;
  border-radius: 999px;
}

.merchant-panel__badge-text {
  font-size: 12px;
  font-weight: 700;
  color: #f97316;
}

.merchant-panel__info-list {
  margin-top: 12px;
}

.merchant-panel__info-item {
  margin-top: 12px;
}

.merchant-panel__info-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.merchant-panel__info-value {
  display: block;
  margin-top: 6px;
  font-size: 14px;
  line-height: 1.7;
  color: #334155;
}
</style>
