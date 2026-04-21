<template>
  <app-container ref="appContainerRef" />
</template>

<script setup>
import { ref } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import AppContainer from '../../components/app/AppContainer.vue'

const appContainerRef = ref(null)

onShow(() => {
  const container = appContainerRef.value
  if (container && typeof container.handlePageShow === 'function') {
    container.handlePageShow()
  }
})

onPullDownRefresh(() => {
  const container = appContainerRef.value
  if (container && typeof container.handlePullDownRefresh === 'function') {
    container.handlePullDownRefresh().finally(() => {
      uni.stopPullDownRefresh()
    })
    return
  }

  uni.stopPullDownRefresh()
})
</script>
