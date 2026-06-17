import React from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import {
  ShieldAlert,
  Zap,
  Search,
  ChevronRight,
  ChevronLeft,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Wifi,
  Flame,
  Lock,
  Clock,
  Users,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { MAP_SOURCES } from './dashboard.map';
import type { DashboardDevice, LocationTreeNode } from './dashboard.types';
import { useDashboardController } from './dashboard.controller';
import { Cascader, CustomSelect, StatCard } from './dashboard.ui';

export const Dashboard = () => {
  const {
    summary,
    loading,
    error,
    mapLoaded,
    mapError,
    selectedRegion,
    currentMapName,
    isDrilling,
    activeModal,
    filters,
    locationTree,
    filteredDevices,
    currentStats,
    onlineRate,
    statusOptions,
    onlineOptions,
    mapOption,
    initialFilters,
    setActiveModal,
    setFilters,
    setRefreshKey,
    resetToChinaView,
    handleMapFocus,
    onChartClick,
  } = useDashboardController();

  return (
    <div className="p-10 space-y-10">
      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <div
            className={cn(
              'relative glass-dark border border-border-subtle rounded-3xl p-6 animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar',
              activeModal.type === 'device' ? 'max-w-lg w-full' : 'max-w-md w-full'
            )}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-base font-display font-bold text-text-primary">{activeModal.title}</h3>
                {activeModal.type === 'device' && (
                  <p className="text-[9px] text-text-secondary font-mono mt-0.5 uppercase tracking-widest">
                    系统遥测数据实时同步中
                  </p>
                )}
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1.5 hover:bg-white/5 rounded-lg transition-all text-text-secondary">
                <ChevronRight className="w-4 h-4 rotate-90" />
              </button>
            </div>

            {activeModal.type === 'device' && activeModal.device ? (
              <div className="space-y-4">
                <div className="glass-dark p-4 rounded-2xl border border-border-subtle">
                  <h4 className="text-[9px] font-bold text-text-secondary uppercase tracking-widest flex items-center mb-4">
                    <ShieldCheck className="w-3 h-3 mr-2 text-brand" /> 基础信息
                  </h4>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-3">
                    {[
                      { label: '设备 SN', value: activeModal.device.sn },
                      { label: '设备名称', value: activeModal.device.name },
                      { label: '型号', value: activeModal.device.model },
                      { label: '固件版本', value: activeModal.device.version },
                      { label: '激活时间', value: activeModal.device.activationTime },
                      { label: '部署地址', value: activeModal.device.address },
                    ].map((item, index) => (
                      <div key={index} className={index === 5 ? 'col-span-2' : ''}>
                        <p className="text-[8px] font-mono text-text-secondary uppercase tracking-widest mb-0.5">{item.label}</p>
                        <p className="text-[11px] font-bold text-text-primary truncate">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-dark p-4 rounded-2xl border border-border-subtle">
                  <h4 className="text-[9px] font-bold text-text-secondary uppercase tracking-widest flex items-center mb-4">
                    <Zap className="w-3 h-3 mr-2 text-warning" /> 最新状态
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: '在线状态', value: activeModal.device.online, icon: Wifi, color: activeModal.device.online === '在线' ? 'text-success' : 'text-danger' },
                      { label: '火焰状态', value: activeModal.device.fire ? '燃烧中' : '未点火', icon: Flame, color: activeModal.device.fire ? 'text-warning' : 'text-text-secondary' },
                      { label: '锁定状态', value: activeModal.device.locked ? '已锁定' : '未锁定', icon: Lock, color: activeModal.device.locked ? 'text-danger' : 'text-success' },
                      { label: '最后心跳', value: activeModal.device.time, icon: Clock, color: 'text-brand' },
                    ].map((item, index) => (
                      <div key={index} className="bg-white/5 p-2.5 rounded-xl border border-border-subtle">
                        <div className="flex items-center justify-between mb-1.5">
                          <item.icon className={`w-2.5 h-2.5 ${item.color}`} />
                          <span className="text-[7px] font-mono text-text-secondary uppercase">{item.label}</span>
                        </div>
                        <p className="text-[10px] font-bold text-text-primary">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: '核心温度', value: activeModal.device.metrics.temp },
                      { label: '燃气浓度', value: activeModal.device.metrics.gas },
                      { label: '流量', value: activeModal.device.metrics.flow },
                    ].map((item, index) => (
                      <div key={index} className="bg-white/5 p-2.5 rounded-xl border border-border-subtle">
                        <p className="text-[7px] font-mono text-text-secondary uppercase mb-0.5">{item.label}</p>
                        <p className="text-xs font-black text-text-primary">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-dark p-4 rounded-2xl border border-border-subtle">
                  <h4 className="text-[9px] font-bold text-text-secondary uppercase tracking-widest flex items-center mb-4">
                    <Users className="w-3 h-3 mr-2 text-success" /> 所属用户
                  </h4>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-border-subtle">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-brand" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-text-primary">{activeModal.device.owner}</p>
                        <p className="text-[9px] text-text-secondary font-mono mt-0.5">主账户权限</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-brand/10 text-brand text-[8px] font-bold uppercase">已认证</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="w-full py-3 bg-brand text-white rounded-xl text-xs font-bold hover:brand-glow transition-all shadow-lg shadow-brand/20"
                  >
                    关闭详情
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-text-secondary font-mono leading-relaxed mb-8 whitespace-pre-line">{activeModal.content}</p>
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-full py-3 bg-brand text-white rounded-xl text-xs font-bold hover:brand-glow transition-all"
                >
                  确定
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="设备总数" value={(summary?.totalDevices || 0).toLocaleString()} subText="在线设备总量" />
        <StatCard title="在线率" value={`${onlineRate}%`} subText="当前实时连接比例" />
        <StatCard title="告警总数" value={(summary?.activeAlerts || 0).toLocaleString()} subText="待处理安全事件" />
        <StatCard title="今日新增" value={`+${summary?.todayNewDevices || 0}`} subText="今日新绑定设备" />
      </div>

      {error && (
        <div className="glass-dark rounded-2xl border border-danger/30 bg-danger/5 p-4 text-[10px] font-mono text-danger uppercase tracking-widest">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div id="global-distribution-map" className="lg:col-span-3 glass-dark rounded-3xl overflow-hidden flex flex-col border border-border-subtle relative">
          <div className="p-6 border-b border-border-subtle flex justify-between items-center bg-white/5 light:bg-black/[0.02]">
            <div>
              <h3 className="text-sm font-display font-bold text-text-primary tracking-widest uppercase">全球分布矩阵</h3>
              <p className="text-[10px] text-text-secondary font-mono mt-1">实时遥测中的 AI 燃烧同步</p>
            </div>
            <div className="flex space-x-2">
              {(selectedRegion || currentMapName !== 'china') && (
                <button
                  onClick={resetToChinaView}
                  className="px-3 py-1 bg-brand/10 border border-brand/20 rounded-lg text-brand text-[10px] font-mono font-bold hover:bg-brand hover:text-white transition-all flex items-center space-x-1 animate-in fade-in slide-in-from-right-2"
                >
                  <ChevronLeft className="w-3 h-3" />
                  <span>返回全域</span>
                </button>
              )}
              <button onClick={() => setRefreshKey((value) => value + 1)} className="p-2 hover:bg-white/5 rounded-lg transition-all text-text-secondary">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="h-[500px] relative bg-bg-main/20 flex items-center justify-center">
            {isDrilling && (
              <div className="absolute inset-0 z-10 bg-black/20 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-300">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin mb-3" />
                  <span className="text-[10px] font-mono text-brand uppercase tracking-widest">正在进入市级矩阵...</span>
                </div>
              </div>
            )}
            {mapLoaded ? (
              <ReactECharts
                echarts={echarts}
                option={mapOption}
                style={{ height: '100%', width: '100%' }}
                onEvents={{ click: onChartClick }}
                notMerge
                lazyUpdate
              />
            ) : mapError ? (
              <div className="text-center p-10 animate-in fade-in duration-500">
                <ShieldAlert className="w-12 h-12 text-danger mx-auto mb-4 opacity-50" />
                <p className="text-text-secondary font-mono text-xs mb-4">全球地理坐标同步失败</p>
                <button
                  onClick={() => setRefreshKey((value) => value + 1)}
                  className="px-8 py-2 bg-brand/10 border border-brand/20 text-brand rounded-xl text-[10px] font-mono font-bold hover:bg-brand hover:text-black transition-all uppercase tracking-widest"
                >
                  重新初始化
                </button>
              </div>
            ) : (
              <div className="text-center animate-in fade-in duration-500">
                <div className="w-10 h-10 border-2 border-brand/30 border-t-brand rounded-full animate-spin mx-auto mb-4" />
                <p className="text-text-secondary font-mono text-[10px] animate-pulse uppercase tracking-widest">正在建立地理数据隧道...</p>
                <p className="text-[8px] text-text-secondary/50 font-mono mt-2">尝试节点: {MAP_SOURCES.length} 个可用源</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="glass-dark rounded-3xl border border-border-subtle p-6 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                <h3 className="text-xs font-display font-bold text-text-primary tracking-widest uppercase">区域详情</h3>
              </div>
              <span className="text-[10px] font-mono text-brand bg-brand/10 px-2 py-0.5 rounded-full border border-brand/20">
                {selectedRegion ? '局部视图' : '全域视图'}
              </span>
            </div>

            <div className="mb-8">
              <p className="text-[10px] text-text-secondary font-mono uppercase tracking-tighter mb-1">当前选定区域</p>
              <h4 className="text-2xl font-display font-bold text-text-primary">{currentStats.name}</h4>
            </div>

            <div className="space-y-6 flex-1">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-[10px] text-text-secondary font-mono mb-2 uppercase">设备总数</p>
                <p className="text-xl font-display font-bold text-text-primary">{currentStats.total.toLocaleString()}</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-success/5 border border-success/10">
                  <div className="flex items-center space-x-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-success" />
                    <span className="text-[10px] font-mono text-text-secondary">在线设备</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-success">{currentStats.online.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-danger/5 border border-danger/10">
                  <div className="flex items-center space-x-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-danger" />
                    <span className="text-[10px] font-mono text-text-secondary">离线设备</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-danger">{currentStats.offline.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-warning/5 border border-warning/10">
                  <div className="flex items-center space-x-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-warning" />
                    <span className="text-[10px] font-mono text-text-secondary">告警设备</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-warning">{currentStats.alert.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border-subtle">
              <div className="flex items-center justify-between text-[10px] font-mono text-text-secondary mb-2">
                <span>在线率</span>
                <span>{currentStats.total > 0 ? ((currentStats.online / currentStats.total) * 100).toFixed(1) : '0.0'}%</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand transition-all duration-1000"
                  style={{ width: `${currentStats.total > 0 ? (currentStats.online / currentStats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-dark rounded-3xl overflow-hidden border border-border-subtle">
        <div className="p-8 border-b border-border-subtle bg-white/5 light:bg-black/[0.02]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h3 className="text-sm font-display font-bold text-text-primary tracking-widest uppercase">设备实时状态列表</h3>
              <p className="text-[10px] text-text-secondary font-mono mt-1">实时同步全网设备运行矩阵</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Cascader
                locationTree={locationTree}
                value={{ country: filters.country, province: filters.province, city: filters.city }}
                onChange={(value) => setFilters({ ...filters, ...value })}
              />

              <CustomSelect
                value={filters.online}
                onChange={(value) => setFilters({ ...filters, online: value })}
                placeholder="所有连接"
                options={onlineOptions}
              />

              <CustomSelect
                value={filters.status}
                onChange={(value) => setFilters({ ...filters, status: value })}
                placeholder="所有状态"
                options={statusOptions}
              />

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                <input
                  type="text"
                  placeholder="搜索 SN..."
                  value={filters.search}
                  onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                  className="pl-10 pr-4 py-2 bg-black/40 light:bg-black/[0.03] border border-border-subtle rounded-xl text-[10px] font-mono text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none w-48 transition-all"
                />
              </div>

              <button
                onClick={() => setFilters(initialFilters)}
                className="px-4 py-2 border border-border-subtle rounded-xl text-[10px] font-mono font-bold text-text-secondary hover:text-brand hover:border-brand/50 hover:bg-brand/5 transition-all flex items-center space-x-2"
              >
                <RefreshCw className="w-3 h-3" />
                <span>清空筛选</span>
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 light:bg-black/[0.02] border-b border-border-subtle">
                <th className="px-8 py-4 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">设备 SN</th>
                <th className="px-8 py-4 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">区域</th>
                <th className="px-8 py-4 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">型号</th>
                <th className="px-8 py-4 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">在线状态</th>
                <th className="px-8 py-4 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">运行状态</th>
                <th className="px-8 py-4 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">最后心跳</th>
                <th className="px-8 py-4 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                    正在加载设备矩阵...
                  </td>
                </tr>
              ) : filteredDevices.length > 0 ? (
                filteredDevices.map((row) => (
                  <tr key={row.id} className="hover:bg-brand/5 transition-all group cursor-pointer border-b border-border-subtle last:border-0">
                    <td className="px-8 py-5 font-mono text-xs font-bold text-text-primary">{row.sn}</td>
                    <td className="px-8 py-5 text-[10px] font-mono text-text-secondary">{row.region}</td>
                    <td className="px-8 py-5 text-[10px] font-mono text-text-secondary">{row.model}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center">
                        <div className={`w-1.5 h-1.5 rounded-full mr-2 brand-glow ${row.online === '在线' ? 'bg-success' : 'bg-danger'}`} />
                        <span className={`text-[10px] font-mono font-bold ${row.online === '在线' ? 'text-success' : 'text-danger'}`}>{row.online}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span
                        className={cn(
                          'px-3 py-1 rounded-lg text-[9px] font-mono font-bold border',
                          row.status === '正常' && 'bg-success/10 text-success border-success/20',
                          row.status === '告警' && 'bg-danger/10 text-danger border-danger/20',
                          row.status === '锁定' && 'bg-warning/10 text-warning border-warning/20',
                          row.status === '离线' && 'bg-white/5 text-text-secondary border-border-subtle'
                        )}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-[10px] font-mono text-text-secondary">{row.time}</td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end space-x-4">
                        <button
                          onClick={() => void handleMapFocus(row.region)}
                          className="text-[10px] font-mono font-bold text-brand hover:underline flex items-center space-x-1"
                        >
                          <MapPin className="w-3 h-3" />
                          <span>聚焦</span>
                        </button>
                        <button
                          onClick={() =>
                            setActiveModal({
                              title: `设备详情 - ${row.sn}`,
                              type: 'device',
                              device: row,
                            })
                          }
                          className="text-[10px] font-mono font-bold text-text-secondary hover:text-text-primary transition-colors"
                        >
                          详情
                        </button>
                        <button
                          onClick={() =>
                            setActiveModal({
                              title: `审计日志 - ${row.sn}`,
                              content: `设备 ${row.sn} 的审计日志已迁移为后端接口模式。\n\n当前仪表盘页仅按原版布局保留入口，详细审计请进入命令审计或设备详情页查看。`,
                            })
                          }
                          className="text-[10px] font-mono font-bold text-text-secondary hover:text-text-primary transition-colors"
                        >
                          审计
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4 opacity-50">
                      <ShieldCheck className="w-12 h-12 text-text-secondary" />
                      <p className="text-xs font-mono font-bold text-text-secondary uppercase tracking-widest">未找到匹配的设备</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
