import { ref, watch, onBeforeUnmount } from 'vue'

/**
 * Deep module: manages a setInterval-based polling loop.
 *
 * Interface: { start, stop, isRunning }
 * - start() / stop() are idempotent
 * - Automatically stops on component unmount
 * - Respects `enabled` ref — pauses when false, resumes when true
 */
export function usePolling(fetchFn, options = {}) {
  const {
    intervalMs = 3000,
    enabled = ref(true),
  } = options

  const isRunning = ref(false)
  let timer = null

  function clearTimer() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  function start() {
    if (isRunning.value) return
    clearTimer()
    isRunning.value = true
    timer = setInterval(() => {
      if (enabled.value) {
        fetchFn()
      }
    }, intervalMs)
  }

  function stop() {
    clearTimer()
    isRunning.value = false
  }

  // Auto-stop when the component that created this hook unmounts
  onBeforeUnmount(() => {
    stop()
  })

  // Pause/resume when enabled changes
  watch(enabled, (value) => {
    if (value && isRunning.value) {
      // Already running — no-op, next tick will fire
    } else if (value && !isRunning.value) {
      start()
    } else if (!value) {
      stop()
    }
  })

  return { start, stop, isRunning }
}
