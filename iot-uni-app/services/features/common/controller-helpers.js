export function createNotifier(notify) {
  return function notifyUser(payload) {
    if (typeof notify === 'function' && payload) {
      notify(payload)
    }
  }
}

export function createCallbackTrigger(callback) {
  return function trigger(...args) {
    if (typeof callback === 'function') {
      return callback(...args)
    }

    return undefined
  }
}

export function normalizeText(value) {
  return String(value ?? '').trim()
}

export function normalizeCompareText(value) {
  return normalizeText(value).toLowerCase()
}

export function hasDuplicateName(items, nextName, options = {}) {
  const {
    getName = (item) => item && item.name,
    getId = (item) => item && item.id,
    excludeId = '',
  } = options

  const normalizedName = normalizeCompareText(nextName)
  if (!normalizedName) {
    return false
  }

  return items.some((item) => {
    return getId(item) !== excludeId && normalizeCompareText(getName(item)) === normalizedName
  })
}

export function formatErrorMessage(error, fallbackMessage) {
  if (error && typeof error.message === 'string' && error.message.trim()) {
    return error.message
  }

  return fallbackMessage
}
