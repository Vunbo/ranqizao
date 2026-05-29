import {
  bindEmailToUser,
  changePassword,
  loginUser,
  registerUser,
} from './auth.email';
import {
  bindPhoneToUser,
  loginPhoneUser,
  sendPhoneBindCode,
  sendPhoneLoginCode,
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
  sendPhoneBindCode,
  sendPhoneLoginCode,
  sendPhoneUnbindCode,
  getCurrentUser,
  listUserIdentities,
  unbindIdentity,
  updateCurrentUserProfile,
};
