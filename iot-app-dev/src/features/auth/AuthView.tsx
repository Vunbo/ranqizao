import React from 'react';
import { motion } from 'motion/react';
import {
  Flame,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { cn } from '../../shared/lib/utils';
import { useAuthForm } from './hooks/useAuthForm';

export const AuthView = ({
  onAuthSuccess,
  showToast,
}: {
  onAuthSuccess: () => void;
  showToast: (msg: string, type?: any) => void;
}) => {
  const {
    isLogin,
    authMethod,
    email,
    emailCode,
    isEmailCodeSent,
    countdown,
    phone,
    verificationCode,
    password,
    confirmPassword,
    loading,
    error,
    confirmationResult,
    isFormValid,
    toggleAuthMode,
    switchAuthMethod,
    handleSendEmailCode,
    handleAuth,
    handleWechatLogin,
    handleGoogleLogin,
    setEmail,
    setEmailCode,
    setPhone,
    setVerificationCode,
    setPassword,
    setConfirmPassword,
    setError,
    setConfirmationResult,
  } = useAuthForm({ onAuthSuccess, showToast });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
            <Flame size={32} />
          </div>
          <h1 className="font-display text-2xl font-bold">AI 安全灶</h1>
          <p className="text-sm text-slate-500">
            {isLogin ? '欢迎回来' : '创建您的账户'}
          </p>
        </div>

        {isLogin && (
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => switchAuthMethod('email')}
              className={cn(
                'flex-1 rounded-lg py-2 text-xs font-bold transition-all',
                authMethod === 'email'
                  ? 'bg-white text-orange-500 shadow-sm'
                  : 'text-slate-500'
              )}
            >
              邮箱登录
            </button>
            <button
              onClick={() => switchAuthMethod('phone')}
              className={cn(
                'flex-1 rounded-lg py-2 text-xs font-bold transition-all',
                authMethod === 'phone'
                  ? 'bg-white text-orange-500 shadow-sm'
                  : 'text-slate-500'
              )}
            >
              手机号登录
            </button>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {authMethod === 'email' ? (
            <>
              <div className="space-y-1">
                <label className="ml-1 text-xs font-bold text-slate-700">
                  邮箱地址
                </label>
                <div className="relative flex space-x-2">
                  <div className="relative flex-1">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError('');
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 outline-none transition-all focus:ring-2 focus:ring-orange-500"
                      placeholder="请输入邮箱，如 123@test.com"
                    />
                  </div>
                  {!isLogin && (
                    <button
                      type="button"
                      onClick={handleSendEmailCode}
                      disabled={loading || countdown > 0}
                      className="whitespace-nowrap rounded-xl bg-slate-100 px-4 py-3 text-xs font-bold text-slate-700 transition-all active:bg-slate-200 disabled:opacity-50"
                    >
                      {countdown > 0
                        ? `${countdown}s 后重发`
                        : isEmailCodeSent
                        ? '重新发送'
                        : '发送验证码'}
                    </button>
                  )}
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-1">
                  <label className="ml-1 text-xs font-bold text-slate-700">
                    邮箱验证码
                  </label>
                  <div className="relative">
                    <ShieldCheck
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      type="text"
                      required
                      value={emailCode}
                      onChange={(e) => {
                        setEmailCode(e.target.value);
                        setError('');
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 outline-none transition-all focus:ring-2 focus:ring-orange-500"
                      placeholder="6 位验证码"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="ml-1 text-xs font-bold text-slate-700">
                  密码
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 outline-none transition-all focus:ring-2 focus:ring-orange-500"
                    placeholder="请输入密码"
                  />
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-1">
                  <label className="ml-1 text-xs font-bold text-slate-700">
                    确认密码
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError('');
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 outline-none transition-all focus:ring-2 focus:ring-orange-500"
                      placeholder="请再次输入密码"
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="space-y-1">
                <label className="ml-1 text-xs font-bold text-slate-700">
                  手机号码
                </label>
                <div className="relative">
                  <Smartphone
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type="tel"
                    required
                    disabled={!!confirmationResult}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setError('');
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 outline-none transition-all focus:ring-2 focus:ring-orange-500 disabled:bg-slate-50"
                    placeholder="+86 138..."
                  />
                </div>
              </div>

              {confirmationResult && (
                <div className="space-y-1">
                  <label className="ml-1 text-xs font-bold text-slate-700">
                    验证码
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      type="text"
                      required
                      value={verificationCode}
                      onChange={(e) => {
                        setVerificationCode(e.target.value);
                        setError('');
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 outline-none transition-all focus:ring-2 focus:ring-orange-500"
                      placeholder="6 位验证码"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <p className="text-center text-xs font-medium text-rose-500">
              {error}
            </p>
          )}
          {!isLogin &&
            password &&
            confirmPassword &&
            password !== confirmPassword && (
              <p className="text-center text-xs font-medium text-rose-500">
                两次输入的密码不一致
              </p>
            )}

          <button
            type="submit"
            disabled={loading || !isFormValid()}
            className="flex w-full items-center justify-center space-x-2 rounded-xl bg-orange-500 py-3 font-bold text-white shadow-lg shadow-orange-500/20 transition-all active:scale-95 disabled:shadow-none disabled:opacity-50 disabled:active:scale-100"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <span>
                {authMethod === 'phone'
                  ? confirmationResult
                    ? '确认验证码'
                    : '发送验证码'
                  : isLogin
                  ? '登录'
                  : '注册'}
              </span>
            )}
          </button>

          {confirmationResult && (
            <button
              type="button"
              onClick={() => setConfirmationResult(false)}
              className="w-full text-xs font-medium text-slate-400"
            >
              修改手机号
            </button>
          )}
        </form>

        {isLogin && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-50 px-2 text-slate-400">快捷登录</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleWechatLogin}
                disabled={loading}
                className="flex items-center justify-center space-x-2 rounded-xl border border-slate-200 bg-white py-3 font-bold text-slate-700 transition-all active:bg-slate-50"
              >
                <MessageSquare
                  size={20}
                  className="text-[#07C160]"
                  fill="currentColor"
                />
                <span>微信</span>
              </button>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="flex items-center justify-center space-x-2 rounded-xl border border-slate-200 bg-white py-3 font-bold text-slate-700 transition-all active:bg-slate-50"
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  className="h-5 w-5"
                  alt="谷歌"
                />
                <span>谷歌</span>
              </button>
            </div>
          </>
        )}

        <p className="text-center text-sm text-slate-500">
          {isLogin ? '还没有账户？' : '已经有账户？'}
          <button
            onClick={toggleAuthMode}
            className="ml-1 font-bold text-orange-500"
          >
            {isLogin ? '立即注册' : '立即登录'}
          </button>
        </p>
      </motion.div>
    </div>
  );
};
