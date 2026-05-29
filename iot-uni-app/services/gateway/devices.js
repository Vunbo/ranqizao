import { remoteDeviceService } from '../remote/devices'

export async function listDevices() {
  return remoteDeviceService.list()
}

export async function scanBindableDevice(qrCode) {
  return remoteDeviceService.scanBindable(qrCode)
}

export async function bindScannedDevice(payload) {
  return remoteDeviceService.bindScanned(payload)
}

export async function createDevice(payload) {
  return remoteDeviceService.create(payload)
}

export async function updateDevice(deviceId, payload) {
  return remoteDeviceService.update(deviceId, payload)
}

export async function removeDevice(deviceId) {
  return remoteDeviceService.remove(deviceId)
}

export async function listDeviceLogs(deviceId) {
  return remoteDeviceService.listLogs(deviceId)
}

export async function createDeviceLog(deviceId, payload) {
  return remoteDeviceService.createLog(deviceId, payload)
}

export async function shareDevice(deviceId, userId) {
  return remoteDeviceService.share(deviceId, userId)
}

export async function unshareDevice(deviceId, userId) {
  return remoteDeviceService.unshare(deviceId, userId)
}
