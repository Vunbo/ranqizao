import { computed, onMounted, reactive, ref } from 'vue'
import {
  createNotifier,
  formatErrorMessage,
  normalizeText,
} from '../../helpers/shared-helpers'
import { remoteMerchantService } from '../../api/merchant'

const getMerchantLandingPage = (...args) => remoteMerchantService.getPage(...args)
const getMerchantSummary = (...args) => remoteMerchantService.getSummary(...args)
const submitMerchantApplication = (...args) => remoteMerchantService.submitApplication(...args)

const LEVEL_OPTIONS = [
  { value: 'operations_center', label: '运营中心' },
  { value: 'district_agent', label: '区代理' },
]

const CONTACT_FALLBACK = Object.freeze({
  title: '',
  phone: '',
  wechat: '',
  address: '',
  note: '',
})

const APPLICATION_STATUS_LABELS = {
  pending: '审核中',
  approved: '已通过',
  rejected: '已驳回',
}

const INTERNAL_CONTENT_PATTERNS = [
  '运维中台',
  '请在运维中台',
]

function sanitizePublicText(value) {
  const normalized = normalizeText(value)

  if (!normalized) {
    return ''
  }

  if (INTERNAL_CONTENT_PATTERNS.some((pattern) => normalized.includes(pattern))) {
    return ''
  }

  return normalized
}

export function useMerchantLandingController(options = {}) {
  const { notify } = options

  const isLoading = ref(false)
  const isRefreshing = ref(false)
  const isSubmitting = ref(false)
  const isContactOpen = ref(false)
  const isApplyOpen = ref(false)
  const page = ref(null)
  const summary = ref(null)
  const form = reactive({
    levelCode: LEVEL_OPTIONS[0].value,
    merchantName: '',
    contactName: '',
    contactPhone: '',
    region: '',
    address: '',
    note: '',
  })

  const notifyUser = createNotifier(notify)

  const cards = computed(() => {
    const pageCards = page.value && page.value.payload ? page.value.payload.cards || [] : []
    return pageCards.filter((card) => {
      return Boolean(
        (card && card.title)
        || (card && card.badge)
        || (card && card.note)
        || (card && Array.isArray(card.items) && card.items.length > 0)
      )
    })
  })

  const pageTitle = computed(() => {
    return page.value && page.value.payload
      ? sanitizePublicText(page.value.payload.pageTitle)
      : ''
  })

  const pageSubtitle = computed(() => {
    return page.value && page.value.payload
      ? sanitizePublicText(page.value.payload.pageSubtitle)
      : ''
  })

  const applyNotice = computed(() => {
    return page.value && page.value.payload
      ? sanitizePublicText(page.value.payload.applyNotice)
      : ''
  })

  const contact = computed(() => {
    return page.value && page.value.payload
      ? {
        title: sanitizePublicText(page.value.payload.contact && page.value.payload.contact.title),
        phone: sanitizePublicText(page.value.payload.contact && page.value.payload.contact.phone),
        wechat: sanitizePublicText(page.value.payload.contact && page.value.payload.contact.wechat),
        address: sanitizePublicText(page.value.payload.contact && page.value.payload.contact.address),
        note: sanitizePublicText(page.value.payload.contact && page.value.payload.contact.note),
      }
      : CONTACT_FALLBACK
  })

  const contactEntries = computed(() => {
    return [
      { label: '联系电话', value: contact.value.phone },
      { label: '微信', value: contact.value.wechat },
      { label: '联系地址', value: contact.value.address },
      { label: '备注', value: contact.value.note },
    ].filter((item) => item.value)
  })

  const hasHeroContent = computed(() => {
    return Boolean(pageTitle.value || pageSubtitle.value || applyNotice.value)
  })

  const latestApplication = computed(() => {
    return summary.value ? summary.value.latestApplication || null : null
  })

  const merchantProfile = computed(() => {
    return summary.value ? summary.value.profile || null : null
  })

  const canApply = computed(() => {
    return summary.value ? Boolean(summary.value.canApply) : false
  })

  const applyButtonText = computed(() => {
    if (merchantProfile.value) {
      return '已入驻'
    }

    if (latestApplication.value && latestApplication.value.status === 'pending') {
      return '审核中'
    }

    if (latestApplication.value && latestApplication.value.status === 'rejected') {
      return '重新申请'
    }

    return '申请入驻'
  })

  const applyDisabled = computed(() => {
    if (isSubmitting.value) {
      return true
    }

    return !canApply.value
  })

  const applicationStatusText = computed(() => {
    if (!latestApplication.value) {
      return merchantProfile.value ? '已开通商户面板' : '暂未提交申请'
    }

    return APPLICATION_STATUS_LABELS[latestApplication.value.status] || latestApplication.value.status
  })

  const applicationStatusDesc = computed(() => {
    if (merchantProfile.value) {
      return '商户面板已开通，可在“我的 > 更多”中进入。'
    }

    if (!latestApplication.value) {
      return '提交入驻申请后，可在这里查看审核状态。'
    }

    return sanitizePublicText(latestApplication.value.reviewComment) || applyNotice.value || '请等待平台审核。'
  })

  function syncFormFromExisting() {
    const source = latestApplication.value || merchantProfile.value || null

    form.levelCode = source && source.levelCode ? source.levelCode : LEVEL_OPTIONS[0].value
    form.merchantName = source && source.merchantName ? source.merchantName : ''
    form.contactName = source && source.contactName ? source.contactName : ''
    form.contactPhone = source && source.contactPhone ? source.contactPhone : ''
    form.region = source && source.region ? source.region : ''
    form.address = source && source.address ? source.address : ''
    form.note = source && source.note ? source.note : ''
  }

  async function load(options = {}) {
    const { silent = false, notifyOnError = true } = options

    if (isLoading.value || isRefreshing.value) {
      return
    }

    if (silent) {
      isRefreshing.value = true
    } else {
      isLoading.value = true
    }

    try {
      const [pageResult, summaryResult] = await Promise.all([
        getMerchantLandingPage(),
        getMerchantSummary(),
      ])

      page.value = pageResult
      summary.value = summaryResult
      syncFormFromExisting()
    } catch (error) {
      if (notifyOnError) {
        notifyUser({
          message: formatErrorMessage(error, '推广/入驻页面加载失败'),
          type: 'error',
        })
      }
    } finally {
      if (silent) {
        isRefreshing.value = false
      } else {
        isLoading.value = false
      }
    }
  }

  function openContact() {
    isContactOpen.value = true
    void load({
      silent: true,
      notifyOnError: false,
    })
  }

  function closeContact() {
    isContactOpen.value = false
  }

  function openApply() {
    if (!canApply.value && !(latestApplication.value && latestApplication.value.status === 'rejected')) {
      return
    }

    syncFormFromExisting()
    isApplyOpen.value = true
  }

  function closeApply(force = false) {
    if (isSubmitting.value && !force) {
      return
    }

    isApplyOpen.value = false
  }

  function updateLevelCode(value) {
    if (LEVEL_OPTIONS.some((item) => item.value === value)) {
      form.levelCode = value
    }
  }

  async function submit() {
    const merchantName = normalizeText(form.merchantName)
    const contactName = normalizeText(form.contactName)
    const contactPhone = normalizeText(form.contactPhone)
    const region = normalizeText(form.region)
    const address = normalizeText(form.address)
    const note = normalizeText(form.note)

    if (!merchantName || !contactName || !contactPhone || !region || !address) {
      notifyUser({
        message: '请完整填写申请信息',
        type: 'error',
      })
      return
    }

    isSubmitting.value = true

    try {
      const result = await submitMerchantApplication({
        levelCode: form.levelCode,
        merchantName,
        contactName,
        contactPhone,
        region,
        address,
        note,
      })

      summary.value = {
        ...(summary.value || {}),
        profile: merchantProfile.value,
        latestApplication: result.application || null,
        canApply: false,
        canEnterPanel: false,
      }

      closeApply(true)
      notifyUser({
        message: '入驻申请已提交，请等待审核',
        type: 'success',
      })
    } catch (error) {
      notifyUser({
        message: formatErrorMessage(error, '入驻申请提交失败'),
        type: 'error',
      })
    } finally {
      isSubmitting.value = false
    }
  }

  async function reload() {
    await load({
      silent: true,
    })
  }

  onMounted(() => {
    void load()
  })

  return {
    isLoading,
    isRefreshing,
    isSubmitting,
    isContactOpen,
    isApplyOpen,
    pageTitle,
    pageSubtitle,
    applyNotice,
    hasHeroContent,
    cards,
    contact,
    contactEntries,
    applyButtonText,
    applyDisabled,
    applicationStatusText,
    applicationStatusDesc,
    levelOptions: LEVEL_OPTIONS,
    form,
    openContact,
    closeContact,
    openApply,
    closeApply,
    updateLevelCode,
    submit,
    reload,
  }
}
