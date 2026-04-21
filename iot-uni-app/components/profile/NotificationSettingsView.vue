<template>
  <view class="notify-view">
    <view class="notify-view__header">
      <view class="notify-view__back" @tap="emit('back')">
        <app-icon name="arrowLeft" :size="18" color="#475569" />
      </view>
      <text class="notify-view__title">消息通知</text>
    </view>

    <card-box
      v-for="item in items"
      :key="item.id"
      custom-style="padding:16px; margin-bottom:10px;"
    >
      <view class="notify-view__row">
        <view class="notify-view__identity">
          <view class="notify-view__icon" :class="`notify-view__icon--${item.id}`">
            <app-icon :name="item.icon" :size="18" :color="item.color" />
          </view>
          <view>
            <text class="notify-view__label">{{ item.label }}</text>
            <text class="notify-view__desc">{{ item.desc }}</text>
          </view>
        </view>
        <view class="notify-view__switch" :class="{ 'notify-view__switch--on': settings[item.id] }" @tap="toggle(item.id)">
          <view class="notify-view__switch-ball" :class="{ 'notify-view__switch-ball--on': settings[item.id] }"></view>
        </view>
      </view>
    </card-box>
  </view>
</template>

<script setup>
import { reactive } from 'vue'
import AppIcon from '../ui/AppIcon.vue'
import CardBox from '../ui/CardBox.vue'

const emit = defineEmits(['back'])

const settings = reactive({
  safety: true,
  status: true,
  system: true,
})

const items = [
  {
    id: 'safety',
    label: '安全预警',
    desc: '燃气泄漏、异常高温等紧急告警',
    icon: 'alert',
    color: '#f43f5e',
  },
  {
    id: 'status',
    label: '设备状态',
    desc: '设备开关机、火力调节等状态变更',
    icon: 'activity',
    color: '#f97316',
  },
  {
    id: 'system',
    label: '系统通知',
    desc: '固件更新、功能上线等系统消息',
    icon: 'bell',
    color: '#3b82f6',
  },
]

function toggle(key) {
  settings[key] = !settings[key]
}
</script>

<style scoped>
.notify-view__header {
  display: flex;
  align-items: center;
  margin-bottom: 18px;
}

.notify-view__back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
}

.notify-view__title {
  margin-left: 12px;
  font-size: 20px;
  font-weight: 700;
  font-family: 'Outfit', sans-serif;
}

.notify-view__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.notify-view__identity {
  display: flex;
  align-items: center;
  flex: 1;
}

.notify-view__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-right: 12px;
  background: #f8fafc;
  border-radius: 14px;
}

.notify-view__label {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.notify-view__desc {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: #94a3b8;
}

.notify-view__switch {
  position: relative;
  width: 48px;
  height: 28px;
  background: #cbd5e1;
  border-radius: 999px;
}

.notify-view__switch--on {
  background: #f97316;
}

.notify-view__switch-ball {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 20px;
  height: 20px;
  background: #ffffff;
  border-radius: 50%;
}

.notify-view__switch-ball--on {
  left: 24px;
}
</style>
