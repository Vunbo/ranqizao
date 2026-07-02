export function buildEmptyPermissionDialog() {
  return {
    visible: false,
    type: '',
    title: '',
    message: '',
  }
}

export function buildPermissionDialog(type) {
  if (type === 'camera') {
    return {
      visible: true,
      type,
      title: '需要开启摄像头权限',
      message: '绑定设备第一步需要调用摄像头扫码，请在系统设置中允许当前应用使用摄像头。',
    }
  }

  return {
    visible: true,
    type,
    title: '需要开启定位权限',
    message: '绑定设备第二步需要获取当前位置，请在系统设置中允许当前应用使用定位权限。',
  }
}

function readFirstString(...values) {
  for (const value of values) {
    if (typeof value === 'string') {
      const normalizedValue = value.trim()
      if (normalizedValue) {
        return normalizedValue
      }
    }
  }

  return ''
}

function readCoordinate(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsedValue = Number(value)
    if (Number.isFinite(parsedValue)) {
      return parsedValue
    }
  }

  return null
}

function resolveLocationAddress(payload) {
  return (
    payload.address ||
    payload.addr ||
    payload.formattedAddress ||
    payload.poiName ||
    payload.name ||
    ''
  )
}

export function buildLocationPayload(payload, overrides = {}) {
  const latitude = readCoordinate(payload.latitude)
  const longitude = readCoordinate(payload.longitude)
  const address = resolveLocationAddress(payload)

  return {
    latitude,
    longitude,
    address,
    formattedAddress: readFirstString(payload.formattedAddress, address),
    name: readFirstString(payload.name, payload.poiName),
    poiName: readFirstString(payload.poiName, payload.name),
    country: readFirstString(payload.country),
    province: readFirstString(payload.province),
    city: readFirstString(payload.city),
    district: readFirstString(payload.district),
    street: readFirstString(payload.street),
    streetNum: readFirstString(payload.streetNum, payload.streetNumber),
    coordType: readFirstString(payload.coordType, overrides.coordType, payload.type),
    source: readFirstString(payload.source, overrides.source),
    capturedAt: readFirstString(payload.capturedAt, overrides.capturedAt) || new Date().toISOString(),
  }
}

export function hasResolvedAddress(payload) {
  return Boolean(
    payload.address ||
      payload.formattedAddress ||
      payload.province ||
      payload.city ||
      payload.district
  )
}

export function mergeLocationPayload(basePayload, nextPayload) {
  return {
    ...basePayload,
    ...nextPayload,
    latitude: nextPayload.latitude ?? basePayload.latitude,
    longitude: nextPayload.longitude ?? basePayload.longitude,
    address: nextPayload.address || basePayload.address,
    formattedAddress: nextPayload.formattedAddress || basePayload.formattedAddress,
    name: nextPayload.name || basePayload.name,
    poiName: nextPayload.poiName || basePayload.poiName,
    country: nextPayload.country || basePayload.country,
    province: nextPayload.province || basePayload.province,
    city: nextPayload.city || basePayload.city,
    district: nextPayload.district || basePayload.district,
    street: nextPayload.street || basePayload.street,
    streetNum: nextPayload.streetNum || basePayload.streetNum,
    coordType: nextPayload.coordType || basePayload.coordType,
    source: nextPayload.source || basePayload.source,
    capturedAt: basePayload.capturedAt || nextPayload.capturedAt,
  }
}

export function isUserCanceled(errorMessage) {
  return (
    errorMessage.includes('cancel') ||
    errorMessage.includes('fail cancel') ||
    errorMessage.includes('用户取消')
  )
}

export function isPermissionDenied(errorMessage) {
  return (
    errorMessage.includes('auth deny') ||
    errorMessage.includes('authorize no response') ||
    errorMessage.includes('permission') ||
    errorMessage.includes('denied') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('权限') ||
    errorMessage.includes('未授权')
  )
}

function canFallbackToMockScan(errorMessage) {
  return (
    errorMessage.includes('未识别到可绑定设备') ||
    errorMessage.includes('扫码内容不能为空') ||
    errorMessage.includes('设备库存状态异常')
  )
}

export async function resolveScanBindingMode(qrCode, scanBindableDevice) {
  try {
    const scanStatus = await scanBindableDevice(qrCode)

    if (scanStatus.bindStatus === 'already_bound_to_current_user') {
      throw new Error('该设备已绑定到当前账号')
    }

    if (scanStatus.bindStatus === 'already_bound') {
      throw new Error('该设备已被其他账号绑定')
    }

    return {
      mode: 'inventory',
      notice: '',
    }
  } catch (error) {
    const errorMessage = String(error.message || '')
    if (!canFallbackToMockScan(errorMessage)) {
      throw error
    }

    return {
      mode: 'mock',
      notice: '当前二维码未录入设备库，按模拟扫码流程继续。',
    }
  }
}
