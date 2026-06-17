import React, { Fragment, useState, useEffect } from 'react';
import {
  Flame,
  ChevronRight,
  LogOut,
  Bell,
  Menu,
  User,
  Sun,
  Moon
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { clearAuthSession, getStoredAuthUser } from '../lib/auth';
import { cn } from '../lib/cn';
import { OPS_NAV_ITEMS, OPS_ROUTES } from '../router/routes';

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void | Promise<void>;
}

const NavItem = ({ icon: Icon, label, active, onClick }: NavItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      'flex items-center w-full px-4 py-3 mb-1 transition-all duration-200 rounded-xl group text-sm',
      active
        ? 'bg-brand text-black font-bold brand-glow'
        : 'text-text-secondary hover:bg-white/5 light:hover:bg-black/[0.03] hover:text-text-primary'
    )}
  >
    <Icon className={cn('w-5 h-5 mr-3 transition-colors', active ? 'text-black' : 'text-text-secondary group-hover:text-brand')} />
    <span className="tracking-tight">{label}</span>
    {active && <ChevronRight className="w-4 h-4 ml-auto" />}
  </button>
);

function getRoleLabel(role: string) {
  if (role === 'super_admin') {
    return '超级管理员';
  }
  if (role === 'ops_admin') {
    return '运维管理员';
  }
  if (role === 'ops_viewer') {
    return '只读审计员';
  }
  if (role === 'admin') {
    return '超级管理员';
  }

  return role || '运维人员';
}

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLight, setIsLight] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = getStoredAuthUser() ?? {
    adminId: '',
    username: 'admin',
    displayName: '管理员',
    role: 'super_admin' as const,
  };

  useEffect(() => {
    if (isLight) {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [isLight]);

  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  const handleLogout = () => {
    clearAuthSession();
    navigate(OPS_ROUTES.login);
  };

  // Notification panel — reserved for server-pushed events
  const alerts: Array<{ id: number; title: string; time: string; type: string; msg: string }> = [];

  return (
    <div className="flex h-screen bg-bg-main text-text-primary overflow-hidden font-sans selection:bg-brand/30 selection:text-brand transition-colors duration-300">
      <aside className={cn(
        'bg-bg-side border-r border-border-subtle flex flex-col z-40 relative transition-all duration-300',
        isSidebarOpen ? 'w-64' : 'w-20'
      )}>
        <div className="p-6 mb-4 relative">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-brand/10 border border-brand/20 rounded-xl flex items-center justify-center brand-glow shrink-0">
              <Flame className="w-6 h-6 text-brand" />
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden whitespace-nowrap">
                <h2 className="text-lg font-display font-black tracking-tighter uppercase">AI 安全灶</h2>
                <p className="text-[8px] text-brand font-mono uppercase tracking-[0.2em]">运维管理系统 2.0</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {OPS_NAV_ITEMS.map((item) => (
            <Fragment key={item.id}>
              <NavItem
                icon={item.icon}
                label={isSidebarOpen ? item.label : ''}
                active={location.pathname.startsWith(item.path)}
                onClick={() => navigate(item.path)}
              />
            </Fragment>
          ))}
        </nav>

        <div className="p-4 border-t border-border-subtle">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-text-secondary hover:text-danger hover:bg-danger/5 light:hover:bg-danger/[0.03] rounded-xl transition-all group"
          >
            <LogOut className="w-5 h-5 mr-3 group-hover:text-danger" />
            {isSidebarOpen && <span className="text-sm font-bold">退出系统</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 bg-bg-side/80 backdrop-blur-md flex items-center justify-between px-10 z-30 border-b border-border-subtle shadow-sm light:shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center space-x-8">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/5 light:hover:bg-black/[0.02] rounded-lg text-text-secondary transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-brand rounded-full brand-glow animate-pulse" />
              <h1 className="text-text-primary text-sm font-display font-bold tracking-widest uppercase">
                {OPS_NAV_ITEMS.find((item) => location.pathname.startsWith(item.path))?.label || '系统'}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <button
              onClick={() => setIsLight(!isLight)}
              className="p-2 hover:bg-white/5 light:hover:bg-black/[0.02] rounded-lg text-text-secondary hover:text-brand transition-all"
            >
              {isLight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            <div className="relative">
              <button
                onClick={() => setIsAlertsOpen(!isAlertsOpen)}
                className={cn(
                  'relative p-2 transition-colors rounded-lg',
                  isAlertsOpen ? 'text-brand bg-white/5' : 'text-text-secondary hover:text-brand hover:bg-white/5'
                )}
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-4 h-4 bg-danger text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-bg-side">3</span>
              </button>

              {isAlertsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsAlertsOpen(false)} />
                  <div className="absolute top-full mt-4 right-0 z-50 w-80 bg-bg-card border border-border-subtle rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-border-subtle bg-white/5 flex justify-between items-center">
                      <h3 className="text-xs font-bold text-text-primary tracking-widest uppercase">实时通知中心</h3>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {alerts.length === 0 ? (
                        <div className="p-6 text-center text-[10px] text-text-secondary">
                          暂无实时通知
                        </div>
                      ) : (
                        alerts.map((alert) => (
                          <div key={alert.id} className="p-4 border-b border-border-subtle last:border-0 hover:bg-white/5 transition-colors cursor-pointer group">
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex items-center space-x-2">
                                <div className={cn(
                                  'w-1.5 h-1.5 rounded-full',
                                  alert.type === 'danger' ? 'bg-danger' : alert.type === 'warning' ? 'bg-warning' : 'bg-success'
                                )} />
                                <span className="text-[11px] font-bold text-text-primary group-hover:text-brand transition-colors">{alert.title}</span>
                              </div>
                              <span className="text-[9px] font-mono text-text-secondary">{alert.time}</span>
                            </div>
                            <p className="text-[10px] text-text-secondary leading-relaxed pl-3.5">{alert.msg}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="h-8 w-px bg-border-subtle" />

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-xs font-bold text-text-primary">{user.displayName || user.username}</p>
                <p className="text-[9px] text-brand font-mono uppercase tracking-widest">{getRoleLabel(user.role)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center brand-glow">
                <User className="w-6 h-6 text-brand" />
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-bg-main/50">
          {children}
        </div>

        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="hud-corner hud-corner-tl m-4 opacity-20" />
          <div className="hud-corner hud-corner-tr m-4 opacity-20" />
          <div className="hud-corner hud-corner-bl m-4 opacity-20" />
          <div className="hud-corner hud-corner-br m-4 opacity-20" />
        </div>
      </main>
    </div>
  );
};
