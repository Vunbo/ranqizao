import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Lock, User, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { persistAuthSession } from '../lib/auth';
import { OPS_ROUTES } from '../router/routes';
import type { OpsAuthUser } from '../types';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await api.post<{ token: string; user: OpsAuthUser }>('/ops/auth/login', {
        username,
        password,
      });

      persistAuthSession({
        token: result.token,
        user: result.user,
      });
      navigate(OPS_ROUTES.dashboard);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '登录失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-4 left-4 text-[8px] text-brand/20 font-mono uppercase tracking-widest z-50">系统入口 v2.0</div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md glass-dark p-10 rounded-3xl border border-border-subtle relative z-10">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-brand/10 border border-brand/20 rounded-2xl flex items-center justify-center brand-glow mb-6">
            <Flame className="w-10 h-10 text-brand" />
          </div>
          <h1 className="text-2xl font-display font-black text-text-primary tracking-tighter uppercase">AI 安全灶</h1>
          <p className="text-[10px] text-brand font-mono uppercase tracking-[0.3em] mt-2">运维管理系统</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest ml-1">用户名</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-black/40 border border-border-subtle rounded-xl text-sm text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all"
                placeholder="请输入运维后台用户名"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest ml-1">密码</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-black/40 border border-border-subtle rounded-xl text-sm text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all"
                placeholder="请输入密码"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-[10px] font-mono font-bold text-danger text-center uppercase tracking-widest">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-brand text-black rounded-xl font-mono font-bold text-xs uppercase tracking-widest brand-glow hover:bg-brand/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>进入系统</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-border-subtle text-center">
          <p className="text-[9px] text-text-secondary font-mono uppercase tracking-widest">
            &copy; 2026 AI 安全灶运维中心. 保留所有权利.
          </p>
        </div>
      </div>

      <div className="hud-corner hud-corner-tl m-8" />
      <div className="hud-corner hud-corner-tr m-8" />
      <div className="hud-corner hud-corner-bl m-8" />
      <div className="hud-corner hud-corner-br m-8" />
    </div>
  );
};
