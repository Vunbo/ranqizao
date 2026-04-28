<template>
  <image
    class="app-icon"
    :class="{ 'loading-spin': animated }"
    :src="resolvedIconSrc"
    :style="{ width: `${size}px`, height: `${size}px` }"
    mode="aspectFit"
    @error="handleIconError"
  />
</template>

<script setup>
import { computed, ref, watch } from 'vue'

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

const iconSpec = computed(() => {
  const safeName = props.name || 'info'
  const colorKey = String(props.color || '#0f172a').replace('#', '').toLowerCase()
  const fillKey = props.filled ? 1 : 0
  const strokeKey = String(props.strokeWidth || 2).replace('.', '_')
  return {
    safeName,
    colorKey,
    fillKey,
    strokeKey,
  }
})

const resolvedIconSrc = ref('')

function buildIconSrc(input) {
  return `/static/icons/${input.safeName}-${input.colorKey}-f${input.fillKey}-s${input.strokeKey}.svg`
}

watch(
  iconSpec,
  (nextSpec) => {
    resolvedIconSrc.value = buildIconSrc(nextSpec)
  },
  { immediate: true }
)

function handleIconError() {
  const nextSpec = iconSpec.value
  if (nextSpec.fillKey === 1) {
    resolvedIconSrc.value = buildIconSrc({
      ...nextSpec,
      fillKey: 0,
    })
    return
  }

  resolvedIconSrc.value = '/static/icons/info-0f172a-f0-s2.svg'
}
</script>

<style scoped>
.app-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
</style>
