import { normalizeText } from './shared-helpers'

export function getUserShortUid(user, fallback = '') {
  const uid = normalizeText(user && user.uid ? user.uid : '')
  return uid ? uid.slice(0, 8) : fallback
}

export function getUserDisplayName(user, fallback = '') {
  const displayName = normalizeText(user && user.displayName ? user.displayName : '')
  return displayName || fallback
}

export function getDisplayInitial(value, fallback = '-') {
  const normalizedValue = normalizeText(value)
  return normalizedValue ? normalizedValue.slice(0, 1) : fallback
}

export function isOwnedByShortUid(resource, shortUid) {
  return Boolean(resource && shortUid && resource.ownerId === shortUid)
}
