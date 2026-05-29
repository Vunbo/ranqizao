import { remoteHomeService } from '../remote/homes'

export async function listHomes() {
  return remoteHomeService.list()
}

export async function createHome(name) {
  return remoteHomeService.create(name)
}

export async function removeHome(homeId) {
  return remoteHomeService.remove(homeId)
}

export async function updateHomeDeviceLinks(homeId, deviceIds) {
  return remoteHomeService.updateDeviceLinks(homeId, deviceIds)
}

export async function addHomeMember(homeId, userId) {
  return remoteHomeService.addMember(homeId, userId)
}

export async function removeHomeMembers(homeId, userIds) {
  return remoteHomeService.removeMembers(homeId, userIds)
}
