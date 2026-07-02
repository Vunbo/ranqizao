<template>
  <view class="bottom-navigation safe-bottom">
    <view
      v-for="tab in tabs"
      :key="tab.id"
      class="bottom-navigation__item"
      :class="{ 'bottom-navigation__item--active': activeTab === tab.id }"
      @tap="$emit('change', tab.id)"
    >
      <view class="bottom-navigation__glow" v-if="activeTab === tab.id"></view>
      <app-icon
        :name="tab.icon"
        :size="20"
        :color="activeTab === tab.id ? '#f97316' : '#94a3b8'"
        :stroke-width="activeTab === tab.id ? 2.5 : 2"
      />
      <text
        class="bottom-navigation__label"
        :class="{ 'bottom-navigation__label--active': activeTab === tab.id }"
      >
        {{ tab.label }}
      </text>
      <view class="bottom-navigation__dot" v-if="activeTab === tab.id"></view>
    </view>
  </view>
</template>

<script setup>
import AppIcon from '../ui/AppIcon.vue'

defineEmits(['change'])

defineProps({
  activeTab: {
    type: String,
    default: 'home',
  },
})

const tabs = [
  { id: 'home', label: '首页', icon: 'flame' },
  { id: 'safety', label: '安全', icon: 'shield' },
  { id: 'mall', label: '商城', icon: 'bag' },
  { id: 'profile', label: '我的', icon: 'user' },
]
</script>

<style scoped>
.bottom-navigation {
  position: fixed;
  left: 50%;
  bottom: 32px;
  width: calc(100% - 48px);
  max-width: 512px;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 32px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 999px;
  box-shadow: 0 14px 40px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(14px);
  transform: translateX(-50%);
}

.bottom-navigation__item {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 48px;
  border-radius: 999px;
}

.bottom-navigation__item--active {
  color: #f97316;
}

.bottom-navigation__item--active .app-icon {
  transform: translateY(-2px) scale(1.1);
}

.bottom-navigation__glow {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: #fff7ed;
  border-radius: 999px;
}

.bottom-navigation__label {
  margin-top: 2px;
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
}

.bottom-navigation__label--active {
  color: #f97316;
}

.bottom-navigation__dot {
  position: absolute;
  bottom: -1px;
  width: 4px;
  height: 4px;
  background: #f97316;
  border-radius: 50%;
}
</style>
