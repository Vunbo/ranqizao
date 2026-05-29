import {
  ShieldAlert,
  CheckCircle2,
  AlertOctagon,
  ThermometerSnowflake,
  Search,
  MoreHorizontal,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { formatTime } from '../common/time';
import { useAlertCenterController } from './alert-center.controller';
const AlertBadge = ({ level }: { level: string }) => {
  const styles: Record<string, string> = {
    critical: 'bg-danger/10 text-danger border-danger/20 brand-glow',
    high: 'bg-warning/10 text-warning border-warning/20',
    normal: 'bg-brand/10 text-brand border-brand/20',
  };
  const labels: Record<string, string> = {
    critical: '紧急威胁',
    high: '高危风险',
    normal: '系统建议',
  };

  return (
    <span className={`px-3 py-1 rounded-lg text-[9px] font-mono font-bold border uppercase tracking-widest ${styles[level] || styles.normal}`}>
      {labels[level] || level}
    </span>
  );
};

export const AlertCenter = () => {
  const {
    alerts,
    searchQuery,
    levelFilter,
    statusFilter,
    loading,
    error,
    stats,
    setSearchQuery,
    setLevelFilter,
    setStatusFilter,
    handleResolve,
    handleMarkAsFalsePositive,
    clearFilters,
  } = useAlertCenterController();
  return (
    <div className="p-10 space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-black text-text-primary tracking-widest uppercase">安全指挥中心</h2>
          <p className="text-text-secondary text-[10px] font-mono font-bold mt-1 tracking-[0.2em]">0.3S 实时事件响应协议</p>
        </div>
        <div className="flex space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              placeholder="搜索设备 SN 或消息..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-10 pr-4 py-2 bg-black/40 border border-border-subtle rounded-xl text-[10px] font-mono text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none w-64 transition-all"
            />
          </div>
          <select
            value={levelFilter}
            onChange={(event) => setLevelFilter(event.target.value)}
            className="px-4 py-2 bg-black/40 border border-border-subtle rounded-xl text-[10px] font-mono text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all appearance-none"
          >
            <option value="">所有等级</option>
            <option value="critical">紧急威胁</option>
            <option value="high">高危风险</option>
            <option value="normal">系统建议</option>
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="px-4 py-2 bg-black/40 border border-border-subtle rounded-xl text-[10px] font-mono text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all appearance-none"
          >
            <option value="">所有状态</option>
            <option value="pending">待处理</option>
            <option value="resolved">已解决</option>
            <option value="false_positive">误报</option>
          </select>
          <button
            onClick={clearFilters}
            className="p-2 bg-white/5 border border-border-subtle rounded-xl text-text-secondary hover:bg-white/10 hover:text-text-primary transition-all"
            title="重置筛选"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-dark rounded-2xl border border-border-subtle p-5">
          <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-2">待处理</p>
          <p className="text-3xl font-display font-black text-warning">{stats.pending}</p>
        </div>
        <div className="glass-dark rounded-2xl border border-border-subtle p-5">
          <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-2">已解决</p>
          <p className="text-3xl font-display font-black text-success">{stats.resolved}</p>
        </div>
        <div className="glass-dark rounded-2xl border border-border-subtle p-5">
          <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-2">误报</p>
          <p className="text-3xl font-display font-black text-text-secondary">{stats.falsePositive}</p>
        </div>
      </div>

      {error && (
        <div className="glass-dark rounded-2xl border border-danger/30 bg-danger/5 p-4 text-[10px] font-mono text-danger uppercase tracking-widest">
          {error}
        </div>
      )}

      <div className="glass-dark rounded-3xl border border-border-subtle overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-border-subtle">
              <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">告警事件</th>
              <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">等级/状态</th>
              <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">发生时间</th>
              <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">处理人</th>
              <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                  正在加载告警数据...
                </td>
              </tr>
            ) : alerts.length > 0 ? alerts.map((alert) => (
              <tr key={alert.id} className={`hover:bg-brand/5 transition-all group cursor-pointer ${alert.status === 'pending' ? '' : 'opacity-60'}`}>
                <td className="px-8 py-6">
                  <div className="flex items-start">
                    <div className={`p-3 rounded-xl border mr-4 ${alert.level === 'critical' ? 'bg-danger/10 border-danger/20 text-danger' : 'bg-warning/10 border-warning/20 text-warning'}`}>
                      {alert.type === 'gas_leak' ? <AlertOctagon className="w-5 h-5" /> : <ThermometerSnowflake className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-mono text-sm font-bold text-text-primary tracking-tight">{alert.deviceSn}</p>
                      <p className="text-[10px] text-text-secondary mt-1">{alert.message}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex flex-col space-y-2">
                    <AlertBadge level={alert.level} />
                    <span className={`text-[9px] font-mono font-bold uppercase ${alert.status === 'pending' ? 'text-warning' : alert.status === 'resolved' ? 'text-success' : 'text-text-secondary'}`}>
                      {alert.status === 'pending' ? '待处理' : alert.status === 'resolved' ? '已解决' : '误报'}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <p className="text-[10px] font-mono text-text-secondary">{formatTime(alert.triggeredAt)}</p>
                </td>
                <td className="px-8 py-6">
                  <p className="text-[10px] font-mono text-text-secondary">{alert.handlerName}</p>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end space-x-3 opacity-0 group-hover:opacity-100 transition-all">
                    {alert.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleResolve(alert.id)}
                          className="px-3 py-1.5 bg-brand/10 border border-brand/20 text-brand rounded-lg text-[9px] font-mono font-bold hover:bg-brand hover:text-black transition-all uppercase"
                        >
                          处理
                        </button>
                        <button
                          onClick={() => handleMarkAsFalsePositive(alert.id)}
                          title="标记为误报"
                          className="p-2 bg-white/5 border border-border-subtle text-text-secondary hover:text-danger hover:border-danger/40 rounded-lg transition-all"
                        >
                          <EyeOff className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button className="p-2 bg-white/5 border border-border-subtle text-text-secondary hover:text-text-primary rounded-lg transition-all">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <ShieldAlert className="w-12 h-12 text-text-secondary opacity-20" />
                    <p className="text-text-secondary text-sm font-mono">未发现符合条件的告警记录</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
