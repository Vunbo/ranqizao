import { type FormEvent, useEffect, useState } from 'react';
import { authApi } from '../../../shared/api/auth';

export function useAuthForm({
  onAuthSuccess,
  showToast,
}: {
  onAuthSuccess: () => void;
  showToast: (msg: string, type?: any) => void;
}) {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [isEmailCodeSent, setIsEmailCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(false);

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [countdown]);

  const resetAuthFields = () => {
    setError('');
    setPassword('');
    setConfirmPassword('');
    setVerificationCode('');
    setEmailCode('');
    setIsEmailCodeSent(false);
    setCountdown(0);
    setConfirmationResult(false);
  };

  const isFormValid = () => {
    if (isLogin) {
      if (authMethod === 'email') {
        return Boolean(email && password);
      }

      return Boolean(phone && (confirmationResult ? verificationCode : true));
    }

    return Boolean(
      email &&
        emailCode &&
        password &&
        confirmPassword &&
        password === confirmPassword
    );
  };

  const toggleAuthMode = () => {
    const nextIsLogin = !isLogin;
    setIsLogin(nextIsLogin);

    if (!nextIsLogin) {
      setAuthMethod('email');
    }

    resetAuthFields();
  };

  const switchAuthMethod = (method: 'email' | 'phone') => {
    setAuthMethod(method);
    resetAuthFields();
  };

  const handleSendEmailCode = () => {
    if (!email) {
      setError('请输入邮箱地址');
      return;
    }

    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setIsEmailCodeSent(true);
      setCountdown(60);
      showToast(
        '验证码已发送至邮箱，当前演示验证码为 123456。',
        'success'
      );
    }, 800);
  };

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (authMethod !== 'email') {
        throw new Error('本地数据库版暂未启用手机号登录，请使用邮箱登录。');
      }

      if (isLogin) {
        await authApi.login({ email, password });
      } else {
        if (password !== confirmPassword) {
          setError('两次输入的密码不一致');
          setLoading(false);
          return;
        }

        if (emailCode !== '123456') {
          setError('邮箱验证码错误');
          setLoading(false);
          return;
        }

        await authApi.register({
          email,
          password,
          displayName: email.split('@')[0],
        });
      }

      onAuthSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || '认证失败，请检查输入内容');
      setConfirmationResult(false);
    } finally {
      setLoading(false);
    }
  };

  const handleWechatLogin = () => {
    showToast('本地数据库版暂未启用微信登录，请使用邮箱登录。', 'info');
  };

  const handleGoogleLogin = async () => {
    showToast('本地数据库版暂未启用谷歌登录，请使用邮箱登录。', 'info');
  };

  return {
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
  };
}
