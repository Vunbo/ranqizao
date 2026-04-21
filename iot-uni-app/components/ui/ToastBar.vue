<template>
  <view class="toast-bar" :class="`toast-bar--${type}`">
    <view class="toast-bar__icon">
      <app-icon :name="iconName" :size="18" color="#ffffff" />
    </view>
    <text class="toast-bar__text">{{ message }}</text>
    <view class="toast-bar__close" @tap="$emit('close')">
      <app-icon name="close" :size="14" color="#ffffff" />
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

defineEmits(['close'])

const props = defineProps({
  message: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    default: 'info',
  },
})

const iconName = computed(() => {
  if (props.type === 'success') {
    return 'check'
  }
  if (props.type === 'error') {
    return 'alert'
  }
  return 'info'
})
</script>

<style scoped>
.toast-bar {
  position: fixed;
  top: calc(env(safe-area-inset-top) + 18px);
  left: 50%;
  z-index: 220;
  display: flex;
  align-items: center;
  min-width: 260px;
  max-width: calc(100vw - 40px);
  padding: 14px 16px;
  border-radius: 20px;
  transform: translateX(-50%);
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.18);
}

.toast-bar--success {
  background: #10b981;
}

.toast-bar--error {
  background: #f43f5e;
}

.toast-bar--info {
  background: #0f172a;
}

.toast-bar__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
}

.toast-bar__text {
  flex: 1;
  margin: 0 10px;
  font-size: 14px;
  font-weight: 700;
  line-height: 20px;
  color: #ffffff;
}

.toast-bar__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 10px;
}
</style>
