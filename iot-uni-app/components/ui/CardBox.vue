<template>
  <view class="card-box card-box-wrap" :style="customStyle">
    <slot />
  </view>
</template>

<script setup>
defineProps({
  customStyle: {
    type: [String, Object],
    default: '',
  },
})
</script>

<style scoped>
.card-box-wrap {
  padding: 16px;
}
</style>
