export type IdentityProvider =
  | 'email_password'
  | 'phone_sms'
  | 'wechat_app'
  | 'wechat_mini_program'
  | 'google_app';

export interface UserRow {
  id: string;
  short_uid: string;
  primary_email: string | null;
  primary_phone: string | null;
  display_name: string;
  photo_url: string | null;
  status: string;
}

export interface AuthIdentityRow {
  id: string;
  user_pk: string;
  provider: IdentityProvider;
  provider_user_id: string;
  provider_app_id: string;
  union_id: string | null;
  password_hash: string | null;
  is_verified: boolean;
  is_primary: boolean;
  meta: Record<string, unknown> | null;
}

export interface AuthIdentityUserRow extends UserRow {
  identityId: string;
  user_pk: string;
  provider: IdentityProvider;
  provider_user_id: string;
  provider_app_id: string;
  union_id: string | null;
  password_hash: string | null;
  is_verified: boolean;
  is_primary: boolean;
  meta: Record<string, unknown> | null;
}

export type PhoneVerificationPurpose = 'login' | 'bind' | 'unbind';

export interface VerificationCodeRow {
  id: string;
  targetType: 'phone';
  targetValue: string;
  purpose: PhoneVerificationPurpose;
  codeHash: string;
  expiresAt: string;
  usedAt: string | null;
}

export interface WechatCode2SessionResponse {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

export interface WechatAppAccessTokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  openid?: string;
  scope?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

export interface WechatAppUserInfoResponse {
  openid?: string;
  nickname?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

export interface GoogleUserInfoResponse {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

export interface GoogleVerifiedProfile {
  providerUserId: string;
  email: string | null;
  displayName: string;
  photoURL: string | null;
  meta: Record<string, unknown>;
}
