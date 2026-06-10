import { remoteMerchantService } from '../remote/merchant'

export async function getMerchantLandingPage() {
  return remoteMerchantService.getPage()
}

export async function getMerchantSummary() {
  return remoteMerchantService.getSummary()
}

export async function submitMerchantApplication(payload) {
  return remoteMerchantService.submitApplication(payload)
}

export async function getMerchantPanel() {
  return remoteMerchantService.getPanel()
}
