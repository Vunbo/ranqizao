import {
  bindEmailToUser,
  changePassword,
  loginUser,
  registerUser,
} from './auth.email';
import {
  bindPhoneToUser,
  loginPhoneUser,
  registerPhoneUser,
  sendPhoneBindCode,
  sendPhoneLoginCode,
  sendPhoneRegistrationCode,
  sendPhoneUnbindCode,
} from './auth.phone';
import {
  bindGoogleAppToUser,
  bindMiniProgramToUser,
  bindWechatAppToUser,
  loginGoogleAppUser,
  loginMiniProgramUser,
  loginWechatAppUser,
} from './auth.third-party';
import { unbindIdentity } from './auth.unbind';
import {
  getCurrentUser,
  listUserIdentities,
  updateCurrentUserProfile,
} from './auth.profile';

export {
  bindEmailToUser,
  bindGoogleAppToUser,
  bindMiniProgramToUser,
  bindPhoneToUser,
  bindWechatAppToUser,
  changePassword,
  loginGoogleAppUser,
  loginMiniProgramUser,
  loginUser,
  loginWechatAppUser,
  registerUser,
  loginPhoneUser,
  registerPhoneUser,
  sendPhoneBindCode,
  sendPhoneLoginCode,
  sendPhoneRegistrationCode,
  sendPhoneUnbindCode,
  getCurrentUser,
  listUserIdentities,
  unbindIdentity,
  updateCurrentUserProfile,
};
