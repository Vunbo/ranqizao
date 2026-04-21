<template>
  <image
    class="app-icon"
    :class="{ 'loading-spin': animated }"
    :src="iconSrc"
    :style="{ width: `${size}px`, height: `${size}px` }"
    mode="aspectFit"
  />
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: {
    type: String,
    default: 'info',
  },
  size: {
    type: Number,
    default: 16,
  },
  color: {
    type: String,
    default: '#0f172a',
  },
  animated: {
    type: Boolean,
    default: false,
  },
  filled: {
    type: Boolean,
    default: false,
  },
  strokeWidth: {
    type: Number,
    default: 2,
  },
})

const iconSrc = computed(() => {
  const safeName = props.name || 'info'
  const colorKey = String(props.color || '#0f172a').replace('#', '').toLowerCase()
  const fillKey = props.filled ? 1 : 0
  const strokeKey = String(props.strokeWidth || 2).replace('.', '_')
  return `/static/icons/${safeName}-${colorKey}-f${fillKey}-s${strokeKey}.svg`
})
</script>

<style scoped>
.app-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
</style>
