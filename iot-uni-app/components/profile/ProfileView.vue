<template>
  <view class="profile-view">
    <device-management-view
      v-if="activeSubView === 'devices'"
      :devices="devices"
      :user="user"
      @back="emit('change-sub-view', 'main')"
      @toast="emit('toast', $event)"
      @request-confirm="emit('request-confirm', $event)"
      @refresh="emit('refresh')"
    />

    <home-management-view
      v-else-if="activeSubView === 'homes'"
      :homes="homes"
      :devices="devices"
      :user="user"
      @back="emit('change-sub-view', 'main')"
      @toast="emit('toast', $event)"
      @request-confirm="emit('request-confirm', $event)"
      @refresh="emit('refresh')"
    />

    <sharing-management-view
      v-else-if="activeSubView === 'sharing'"
      :devices="devices"
      :homes="homes"
      :user="user"
      @back="emit('change-sub-view', 'main')"
      @toast="emit('toast', $event)"
      @refresh="emit('refresh')"
    />

    <notification-settings-view
      v-else-if="activeSubView === 'notifications'"
      @back="emit('change-sub-view', 'main')"
    />

    <account-management-view
      v-else-if="activeSubView === 'account'"
      :user="user"
      @back="emit('change-sub-view', 'main')"
      @toast="emit('toast', $event)"
      @request-confirm="emit('request-confirm', $event)"
    />

    <view v-else>
      <view class="profile-view__hero">
        <view class="profile-view__avatar-wrap">
          <image class="profile-view__avatar-image" :src="avatarUrl" mode="aspectFill" />
          <view class="profile-view__avatar-status"></view>
        </view>
        <view class="profile-view__name-row" @tap="openEditName">
          <text class="profile-view__name">{{ displayName }}</text>
          <view class="profile-view__name-edit">
            <app-icon name="edit" :size="14" color="#94a3b8" />
          </view>
        </view>
        <view class="profile-view__uid-row">
          <text class="profile-view__uid">UID: {{ shortUid }}</text>
          <view class="profile-view__copy" @tap="copyUid">
            <app-icon name="copy" :size="12" color="#94a3b8" />
          </view>
        </view>
      </view>

      <view class="profile-view__section">
        <text class="section-kicker">通用设置</text>
        <view class="profile-view__card-list">
          <card-box
            v-for="item in settingsItems"
            :key="item.id"
            custom-style="padding:16px; margin-top:12px;"
            @tap="emit('change-sub-view', item.id)"
          >
            <view class="profile-view__setting-row">
              <view class="profile-view__setting-left">
                <view class="profile-view__setting-icon">
                  <app-icon :name="item.icon" :size="16" color="#475569" />
                </view>
                <text class="profile-view__setting-label">{{ item.label }}</text>
              </view>
              <view class="profile-view__setting-right">
                <text class="profile-view__setting-extra">{{ item.extra }}</text>
                <app-icon name="chevron" :size="14" color="#cbd5e1" />
              </view>
            </view>
          </card-box>
        </view>
      </view>

      <view class="profile-view__section">
        <text class="section-kicker">支持与反馈</text>
        <view class="profile-view__card-list">
          <card-box
            v-for="item in supportItems"
            :key="item.label"
            custom-style="padding:16px; margin-top:12px;"
          >
            <view class="profile-view__setting-row">
              <view class="profile-view__setting-left">
                <view class="profile-view__setting-icon">
                  <app-icon :name="item.icon" :size="16" color="#475569" />
                </view>
                <text class="profile-view__setting-label">{{ item.label }}</text>
              </view>
              <view class="profile-view__setting-right">
                <text class="profile-view__setting-extra">{{ item.extra }}</text>
                <app-icon name="chevron" :size="14" color="#cbd5e1" />
              </view>
            </view>
          </card-box>
        </view>
      </view>

      <view class="profile-view__logout" @tap="emit('logout')">
        <text class="profile-view__logout-text">退出登录</text>
      </view>

      <view v-if="isEditNameModalOpen" class="modal-mask" @tap="closeEditName()">
        <view class="profile-view__modal" @tap.stop>
          <text class="profile-view__modal-title">修改名称</text>
          <text class="profile-view__modal-desc">
            名称不能为空，修改后会同步显示到成员列表中。
          </text>
          <view class="profile-view__input">
            <input
              v-model="editDisplayName"
              class="profile-view__input-core"
              placeholder="请输入名称"
              placeholder-style="color:#94a3b8"
            />
          </view>
          <view class="profile-view__modal-actions">
            <view class="profile-view__modal-ghost" @tap="closeEditName()">
              <text class="profile-view__modal-ghost-text">取消</text>
            </view>
            <view class="profile-view__modal-primary" @tap="handleUpdateDisplayName">
              <text class="profile-view__modal-primary-text">
                {{ isUpdatingDisplayName ? '保存中...' : '确认修改' }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import AppIcon from '../ui/AppIcon.vue'
import CardBox from '../ui/CardBox.vue'
import DeviceManagementView from '../device/DeviceManagementView.vue'
import AccountManagementView from './AccountManagementView.vue'
import NotificationSettingsView from './NotificationSettingsView.vue'
import HomeManagementView from './HomeManagementView.vue'
import SharingManagementView from './SharingManagementView.vue'
import { useProfileViewController } from '../../services/features/profile/profile-view-controller'

const props = defineProps({
  user: {
    type: Object,
    default: null,
  },
  devices: {
    type: Array,
    default: () => [],
  },
  homes: {
    type: Array,
    default: () => [],
  },
  activeSubView: {
    type: String,
    default: 'main',
  },
})

const emit = defineEmits([
  'change-sub-view',
  'user-updated',
  'toast',
  'request-confirm',
  'refresh',
  'logout',
])

const {
  isEditNameModalOpen,
  editDisplayName,
  isUpdatingDisplayName,
  shortUid,
  displayName,
  avatarUrl,
  settingsItems,
  supportItems,
  copyUid,
  openEditName,
  closeEditName,
  handleUpdateDisplayName,
} = useProfileViewController({
  props,
  notify: (payload) => emit('toast', payload),
  onUserUpdated: (nextUser) => emit('user-updated', nextUser),
  onRefresh: () => emit('refresh'),
})
</script>

<style scoped>
.profile-view__hero {
  padding: 8px 0 10px;
  text-align: center;
}

.profile-view__avatar-wrap {
  position: relative;
  width: 96px;
  height: 96px;
  margin: 0 auto;
}

.profile-view__avatar-image {
  display: flex;
  width: 96px;
  height: 96px;
  border: 4px solid #ffffff;
  border-radius: 48px;
  background: #e2e8f0;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
}

.profile-view__avatar-status {
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 24px;
  height: 24px;
  background: #10b981;
  border: 2px solid #ffffff;
  border-radius: 50%;
}

.profile-view__name-row {
  display: inline-flex;
  align-items: center;
  margin-top: 16px;
}

.profile-view__name {
  display: block;
  font-size: 24px;
  font-weight: 700;
  font-family: 'Outfit', sans-serif;
}

.profile-view__name-edit {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-left: 6px;
}

.profile-view__uid-row {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 8px;
}

.profile-view__uid {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #94a3b8;
}

.profile-view__copy {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-left: 6px;
}

.profile-view__section {
  margin-top: 22px;
}

.profile-view__setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.profile-view__setting-left,
.profile-view__setting-right {
  display: flex;
  align-items: center;
}

.profile-view__setting-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-right: 12px;
  background: #f8fafc;
  border-radius: 14px;
}

.profile-view__setting-label {
  font-size: 14px;
  font-weight: 700;
  color: #334155;
}

.profile-view__setting-extra {
  margin-right: 8px;
  font-size: 11px;
  color: #94a3b8;
}

.profile-view__logout {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 56px;
  margin-top: 24px;
  background: #fff1f2;
  border-radius: 18px;
}

.profile-view__logout-text {
  font-size: 14px;
  font-weight: 700;
  color: #f43f5e;
}

.profile-view__modal {
  width: 100%;
  max-width: 340px;
  padding: 24px;
  background: #ffffff;
  border-radius: 28px;
}

.profile-view__modal-title {
  display: block;
  font-size: 18px;
  font-weight: 700;
  text-align: center;
}

.profile-view__modal-desc {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  line-height: 18px;
  text-align: center;
  color: #94a3b8;
}

.profile-view__input {
  display: flex;
  align-items: center;
  min-height: 48px;
  margin-top: 18px;
  padding: 0 14px;
  background: #f8fafc;
  border-radius: 16px;
}

.profile-view__input-core {
  width: 100%;
  font-size: 14px;
}

.profile-view__modal-actions {
  display: flex;
  margin-top: 18px;
}

.profile-view__modal-ghost,
.profile-view__modal-primary {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 46px;
  border-radius: 16px;
}

.profile-view__modal-primary {
  background: #f97316;
}

.profile-view__modal-primary-text {
  color: #ffffff;
  font-weight: 700;
}

.profile-view__modal-ghost-text {
  color: #64748b;
  font-weight: 700;
}
</style>
