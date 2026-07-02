import { computed, onMounted, ref } from 'vue'
import {
  createNotifier,
  formatErrorMessage,
} from '../../helpers/shared-helpers'
import { remoteMerchantService } from '../../api/merchant'

const getMerchantPanel = (...args) => remoteMerchantService.getPanel(...args)

export function useMerchantPanelController(options = {}) {
  const { notify } = options

  const isLoading = ref(false)
  const panel = ref(null)
  const notifyUser = createNotifier(notify)

  const profile = computed(() => {
    return panel.value ? panel.value.profile || null : null
  })

  const approvedApplication = computed(() => {
    return panel.value ? panel.value.approvedApplication || null : null
  })

  async function load() {
    isLoading.value = true

    try {
      panel.value = await getMerchantPanel()
    } catch (error) {
      notifyUser({
        message: formatErrorMessage(error, '商户面板加载失败'),
        type: 'error',
      })
    } finally {
      isLoading.value = false
    }
  }

  onMounted(() => {
    void load()
  })

  return {
    isLoading,
    profile,
    approvedApplication,
  }
}
