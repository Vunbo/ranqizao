import { normalizeText } from './shared-helpers'

export function resolveProfileDisplayName(profiles, uid) {
  const matchedProfile = (profiles || []).find((profile) => profile && profile.uid === uid)
  return normalizeText(matchedProfile && matchedProfile.displayName) || uid
}

export function resolveHomeMemberDisplayName(home, uid) {
  const memberProfiles = Array.isArray(home && home.memberProfiles) ? home.memberProfiles : []
  return resolveProfileDisplayName(memberProfiles, uid)
}

export function resolveDeviceMemberDisplayName(device, uid) {
  const sharedProfiles = Array.isArray(device && device.sharedWithProfiles)
    ? device.sharedWithProfiles
    : []
  return resolveProfileDisplayName(sharedProfiles, uid)
}

export function buildDisplayMap(currentMembers, resolver) {
  return currentMembers.reduce((result, uid) => {
    result[uid] = resolver(uid)
    return result
  }, {})
}

export function buildSharedUsers(device) {
  if (!device) {
    return []
  }

  if (Array.isArray(device.sharedWithProfiles) && device.sharedWithProfiles.length) {
    return device.sharedWithProfiles.map((profile) => ({
      uid: profile.uid,
      displayName: normalizeText(profile.displayName) || profile.uid,
    }))
  }

  return (device.sharedWith || []).map((uid) => ({
    uid,
    displayName: uid,
  }))
}

export function getOwnerDisplayName(resource, fallback = '--------') {
  return (
    normalizeText(resource && resource.ownerDisplayName) ||
    normalizeText(resource && resource.ownerId) ||
    fallback
  )
}
