<template>
  <view class="home-view">
    <view class="home-view__header">
      <view class="home-view__header-main">
        <text class="home-view__title">智能安全灶</text>
        <text class="home-view__subtitle">
          {{ devices.length > 0 ? `已连接 ${devices.length} 台设备` : '暂无连接设备' }}
        </text>
      </view>
      <view class="home-view__add" @tap="$emit('open-add-device')">
        <app-icon name="plus" :size="16" color="#ffffff" />
        <text class="home-view__add-text">添加设备</text>
      </view>
    </view>

    <view v-if="devices.length === 0" class="home-view__empty">
      <view class="home-view__empty-icon">
        <app-icon name="flame" :size="32" color="#cbd5e1" />
      </view>
      <text class="home-view__empty-text">点击右上角添加您的第一台安全灶</text>
    </view>

    <view v-else class="home-view__sections">
      <view v-if="myDevices.length" class="home-view__section">
        <text class="section-kicker">我的设备</text>
        <view class="home-view__grid">
          <view
            v-for="device in myDevices"
            :key="device.id"
            class="home-view__card"
            @tap="$emit('select-device', device.id)"
          >
            <card-box custom-style="padding:0; overflow:hidden;">
              <view class="home-view__card-top">
                <view class="home-view__card-identity">
                  <view
                    class="home-view__card-flame"
                    :class="{ 'home-view__card-flame--on': device.isOn }"
                  >
                    <app-icon name="flame" :size="22" :color="device.isOn ? '#ffffff' : '#94a3b8'" />
                  </view>
                  <view class="home-view__card-copy">
                    <text class="home-view__card-name line-clamp-1">{{ device.name }}</text>
                    <view class="home-view__status-line">
                      <view class="home-view__status-dot" :class="{ 'home-view__status-dot--on': device.isOn }"></view>
                      <text class="home-view__status-text">{{ device.isOn ? '运行中' : '待机' }}</text>
                    </view>
                  </view>
                </view>
                <view class="home-view__temp">
                  <text class="home-view__temp-value">{{ formatTemp(device.temp) }}°C</text>
                  <text class="home-view__temp-label">当前温度</text>
                </view>
              </view>
              <view class="home-view__card-bottom">
                <view class="home-view__meta">
                  <view class="home-view__meta-item">
                    <app-icon name="droplet" :size="12" color="#3b82f6" />
                    <text class="home-view__meta-text">{{ Number(device.gas).toFixed(2) }}% LEL</text>
                  </view>
                  <view class="home-view__meta-item">
                    <app-icon name="shield" :size="12" color="#10b981" />
                    <text class="home-view__meta-text">安全</text>
                  </view>
                </view>
                <app-icon name="chevron" :size="16" color="#cbd5e1" />
              </view>
            </card-box>
          </view>
        </view>
      </view>

      <view v-if="sharedDevices.length" class="home-view__section">
        <text class="section-kicker">共享给我的</text>
        <view class="home-view__grid">
          <view
            v-for="device in sharedDevices"
            :key="device.id"
            class="home-view__card"
            @tap="$emit('select-device', device.id)"
          >
            <card-box custom-style="padding:0; overflow:hidden;">
              <view class="home-view__card-top">
                <view class="home-view__card-identity">
                  <view
                    class="home-view__card-flame"
                    :class="{ 'home-view__card-flame--on': device.isOn }"
                  >
                    <app-icon name="flame" :size="22" :color="device.isOn ? '#ffffff' : '#94a3b8'" />
                  </view>
                  <view class="home-view__card-copy">
                    <text class="home-view__card-name line-clamp-1">{{ device.name }}</text>
                    <view class="home-view__status-line">
                      <view class="home-view__status-dot" :class="{ 'home-view__status-dot--on': device.isOn }"></view>
                      <text class="home-view__status-text">{{ device.isOn ? '运行中' : '待机' }}</text>
                    </view>
                  </view>
                </view>
                <view class="home-view__temp">
                  <text class="home-view__temp-value">{{ formatTemp(device.temp) }}°C</text>
                  <text class="home-view__temp-label">当前温度</text>
                </view>
              </view>
              <view class="home-view__card-bottom">
                <view class="home-view__meta">
                  <view class="home-view__meta-item">
                    <app-icon name="droplet" :size="12" color="#3b82f6" />
                    <text class="home-view__meta-text">{{ Number(device.gas).toFixed(2) }}% LEL</text>
                  </view>
                  <view class="home-view__meta-item">
                    <app-icon name="shield" :size="12" color="#10b981" />
                    <text class="home-view__meta-text">安全</text>
                  </view>
                </view>
                <app-icon name="chevron" :size="16" color="#cbd5e1" />
              </view>
            </card-box>
          </view>
        </view>
      </view>
    </view>

    <card-box custom-style="border:0; background:#0f172a; padding:20px;">
      <view class="home-view__tip">
        <view>
          <text class="home-view__tip-title">安全小贴士</text>
          <text class="home-view__tip-desc">
            定期检查燃气管路并保持厨房通风良好，AI 安全灶会持续守护您的烹饪安全。
          </text>
        </view>
        <view class="home-view__tip-icon">
          <app-icon name="shield" :size="18" color="#f97316" />
        </view>
      </view>
    </card-box>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import AppIcon from '../ui/AppIcon.vue'
import CardBox from '../ui/CardBox.vue'

defineEmits(['open-add-device', 'select-device'])

const props = defineProps({
  devices: {
    type: Array,
    default: () => [],
  },
  user: {
    type: Object,
    default: null,
  },
})

const shortUid = computed(() => {
  return props.user && props.user.uid ? props.user.uid.slice(0, 8) : ''
})

const myDevices = computed(() => {
  return props.devices.filter((device) => device.ownerId === shortUid.value)
})

const sharedDevices = computed(() => {
  return props.devices.filter((device) => device.ownerId !== shortUid.value)
})

function formatTemp(value) {
  return Number(value || 0).toFixed(0)
}
</script>

<style scoped>
.home-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
}

.home-view__title {
  display: block;
  font-size: 20px;
  font-weight: 700;
  font-family: 'Outfit', sans-serif;
  color: #0f172a;
}

.home-view__subtitle {
  display: block;
  margin-top: 6px;
  font-size: 10px;
  color: #64748b;
}

.home-view__add {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 12px;
  background: #f97316;
  border-radius: 18px;
  box-shadow: 0 12px 28px rgba(249, 115, 22, 0.2);
}

.home-view__add-text {
  margin-left: 4px;
  font-size: 12px;
  font-weight: 700;
  color: #ffffff;
}

.home-view__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 0;
}

.home-view__empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: #f1f5f9;
  border-radius: 40px;
}

.home-view__empty-text {
  margin-top: 16px;
  font-size: 14px;
  color: #94a3b8;
}

.home-view__section + .home-view__section {
  margin-top: 28px;
}

.home-view__sections {
  margin-bottom: 32px;
}

.home-view__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-top: 12px;
}

.home-view__card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
}

.home-view__card-identity {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1;
}

.home-view__card-flame {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin-right: 14px;
  background: #f1f5f9;
  border-radius: 16px;
}

.home-view__card-flame--on {
  background: #f97316;
}

.home-view__card-copy {
  min-width: 0;
}

.home-view__card-name {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.home-view__status-line {
  display: flex;
  align-items: center;
  margin-top: 6px;
}

.home-view__status-dot {
  width: 8px;
  height: 8px;
  background: #cbd5e1;
  border-radius: 50%;
}

.home-view__status-dot--on {
  background: #10b981;
  animation: pulse-dot 1.6s ease infinite;
}

.home-view__status-text {
  margin-left: 8px;
  font-size: 12px;
  color: #64748b;
}

.home-view__temp {
  margin-left: 12px;
  text-align: right;
}

.home-view__temp-value {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.home-view__temp-label {
  display: block;
  margin-top: 4px;
  font-size: 10px;
  color: #94a3b8;
}

.home-view__card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: #f8fafc;
}

.home-view__meta {
  display: flex;
  align-items: center;
}

.home-view__meta-item {
  display: flex;
  align-items: center;
}

.home-view__meta-item + .home-view__meta-item {
  margin-left: 14px;
}

.home-view__meta-text {
  margin-left: 4px;
  font-size: 10px;
  font-weight: 600;
  color: #475569;
}

.home-view__tip {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.home-view__tip-title {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
}

.home-view__tip-desc {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  line-height: 20px;
  color: rgba(226, 232, 240, 0.82);
}

.home-view__tip-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-left: 16px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

@media screen and (min-width: 640px) {
  .home-view__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media screen and (min-width: 1024px) {
  .home-view__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
