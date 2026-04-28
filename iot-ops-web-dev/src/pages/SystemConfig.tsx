import React, { useEffect, useMemo, useState } from 'react';
import {
  Settings,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Save,
  Plus,
  Trash2,
  Edit3,
  Play,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Mail,
  Zap,
  Clock,
  Search,
  X
} from 'lucide-react';
import { api } from '../lib/api';
import type { OpsConfigItem } from '../types';

type ConfigTab = 'message' | 'alert' | 'risk';

function formatTime(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function buildEmptyConfig(tab: ConfigTab): OpsConfigItem {
  const id = `temp-${Date.now()}`;
  if (tab === 'message') {
    return {
      id,
      name: '新消息模板',
      updatedAt: new Date().toISOString(),
      type: 'message',
      data: {
        title: '新通知',
        content: '请输入内容...',
        channels: ['app'],
        variables: ['deviceId'],
        enabled: true,
      },
    };
  }

  if (tab === 'alert') {
    return {
      id,
      name: '新告警规则',
      updatedAt: new Date().toISOString(),
      type: 'alert',
      data: {
        condition: 'value > 0',
        severity: 'normal',
        actions: ['notify_user'],
        delay: 0,
        enabled: true,
      },
    };
  }

  return {
    id,
    name: '新风控规则',
    updatedAt: new Date().toISOString(),
    type: 'risk',
    data: {
      threshold: 'count > 5',
      action: 'notify_only',
      duration: 3600,
      reason: '默认说明',
      enabled: true,
    },
  };
}

function resolveConfigPath(tab: ConfigTab) {
  if (tab === 'message') return '/ops/configs/templates';
  if (tab === 'alert') return '/ops/configs/alert-rules';
  return '/ops/configs/risk-rules';
}

export const SystemConfig = () => {
  const [activeTab, setActiveTab] = useState<ConfigTab>('message');
  const [configs, setConfigs] = useState<OpsConfigItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<OpsConfigItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationLog, setSimulationLog] = useState<string[]>([]);
  const [testInput, setTestInput] = useState('');
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const tabConfigs = useMemo(() => configs.filter((config) => config.type === activeTab), [configs, activeTab]);

  const loadConfigs = async (tab: ConfigTab) => {
    setLoading(true);
    setError('');
    try {
      const result = await api.get<{ items: OpsConfigItem[] }>(resolveConfigPath(tab));
      setConfigs(result.items || []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '配置加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConfigs(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (tabConfigs.length > 0) {
      const selected = tabConfigs.find((config) => config.id === selectedId) || tabConfigs[0];
      setSelectedId(selected.id);
      setDraft(JSON.parse(JSON.stringify(selected)));
    } else {
      setSelectedId(null);
      setDraft(null);
    }
  }, [tabConfigs, selectedId]);

  const handleSave = async () => {
    if (!draft) {
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const path = resolveConfigPath(activeTab);
      const body = activeTab === 'message'
        ? {
            name: draft.name,
            title: draft.data.title,
            content: draft.data.content,
            channels: draft.data.channels || [],
            variables: draft.data.variables || [],
            enabled: draft.data.enabled !== false,
          }
        : activeTab === 'alert'
          ? {
              name: draft.name,
              severity: draft.data.severity,
              condition: draft.data.condition,
              actions: draft.data.actions || [],
              delay: Number(draft.data.delay || 0),
              enabled: draft.data.enabled !== false,
            }
          : {
              name: draft.name,
              threshold: draft.data.threshold,
              action: draft.data.action,
              duration: Number(draft.data.duration || 0),
              reason: draft.data.reason,
              enabled: draft.data.enabled !== false,
            };

      if (draft.id.startsWith('temp-')) {
        await api.post(path, body);
      } else {
        await api.put(`${path}/${draft.id}`, body);
      }

      await loadConfigs(activeTab);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '配置保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setIdToDelete(id);
  };

  const confirmDelete = async () => {
    if (!idToDelete) {
      return;
    }

    try {
      if (!idToDelete.startsWith('temp-')) {
        await api.delete(`${resolveConfigPath(activeTab)}/${idToDelete}`);
      }
      setConfigs((prev) => prev.filter((config) => config.id !== idToDelete));
      if (selectedId === idToDelete) {
        setSelectedId(null);
      }
      setIdToDelete(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '配置删除失败');
    }
  };

  const handleAdd = () => {
    const newConfig = buildEmptyConfig(activeTab);
    setConfigs((prev) => [newConfig, ...prev.filter((config) => !config.id.startsWith('temp-'))]);
    setSelectedId(newConfig.id);
    setDraft(JSON.parse(JSON.stringify(newConfig)));
  };

  const handleRunSimulation = async () => {
    if (!testInput || !draft || draft.id.startsWith('temp-')) {
      setError('请先保存配置，再输入测试设备 SN 或手机号后运行模拟');
      return;
    }

    setIsSimulating(true);
    setSimulationLog([]);
    setError('');

    try {
      const result = await api.post<{ logs: string[] }>('/ops/configs/simulate', {
        type: activeTab,
        configId: draft.id,
        target: testInput,
      });
      setSimulationLog(result.logs || []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '模拟运行失败');
    } finally {
      setIsSimulating(false);
    }
  };

  const updateDraft = (updater: (prev: OpsConfigItem) => OpsConfigItem) => {
    setDraft((prev) => (prev ? updater(prev) : prev));
  };

  const renderEditor = () => {
    if (!draft || draft.type !== activeTab) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-text-secondary opacity-40">
          <Settings className="w-16 h-16 mb-4" />
          <p className="text-sm font-mono uppercase tracking-widest">请选择当前分类下的规则进行编辑</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'message':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest ml-1">模板名称</label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(event) => updateDraft((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full px-4 py-3 bg-black/40 border border-border-subtle rounded-xl text-sm text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest ml-1">通知标题</label>
                <input
                  type="text"
                  value={draft.data.title || ''}
                  onChange={(event) => updateDraft((prev) => ({ ...prev, data: { ...prev.data, title: event.target.value } }))}
                  className="w-full px-4 py-3 bg-black/40 border border-border-subtle rounded-xl text-sm text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest ml-1">通知内容</label>
              <textarea
                rows={4}
                value={draft.data.content || ''}
                onChange={(event) => updateDraft((prev) => ({ ...prev, data: { ...prev.data, content: event.target.value } }))}
                className="w-full px-4 py-3 bg-black/40 border border-border-subtle rounded-xl text-sm text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all resize-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest ml-1">推送渠道</label>
              <div className="flex space-x-4">
                {[
                  { id: 'sms', label: '短信', icon: MessageSquare },
                  { id: 'app', label: 'APP 推送', icon: Smartphone },
                  { id: 'mail', label: '邮件', icon: Mail },
                ].map((channel) => (
                  <label key={channel.id} className="flex items-center space-x-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={(draft.data.channels || []).includes(channel.id)}
                      onChange={(event) => {
                        updateDraft((prev) => ({
                          ...prev,
                          data: {
                            ...prev.data,
                            channels: event.target.checked
                              ? [...(prev.data.channels || []), channel.id]
                              : (prev.data.channels || []).filter((value: string) => value !== channel.id),
                          },
                        }));
                      }}
                      className="w-4 h-4 rounded border-border-subtle bg-black/40 text-brand focus:ring-brand"
                    />
                    <channel.icon className="w-3.5 h-3.5 text-text-secondary group-hover:text-brand transition-colors" />
                    <span className="text-[10px] font-mono font-bold text-text-secondary group-hover:text-text-primary uppercase">{channel.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );
      case 'alert':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest ml-1">规则名称</label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(event) => updateDraft((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full px-4 py-3 bg-black/40 border border-border-subtle rounded-xl text-sm text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest ml-1">告警等级</label>
                <select
                  value={draft.data.severity || 'normal'}
                  onChange={(event) => updateDraft((prev) => ({ ...prev, data: { ...prev.data, severity: event.target.value } }))}
                  className="w-full px-4 py-3 bg-black/40 border border-border-subtle rounded-xl text-sm text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all appearance-none"
                >
                  <option value="critical">紧急 (CRITICAL)</option>
                  <option value="high">高危 (HIGH)</option>
                  <option value="normal">普通 (NORMAL)</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest ml-1">触发逻辑 (DSL)</label>
              <div className="relative">
                <textarea
                  rows={3}
                  value={draft.data.condition || ''}
                  onChange={(event) => updateDraft((prev) => ({ ...prev, data: { ...prev.data, condition: event.target.value } }))}
                  className="w-full px-4 py-3 bg-black/40 border border-border-subtle rounded-xl text-xs font-mono text-brand focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all resize-none"
                />
                <Zap className="absolute right-4 top-4 w-4 h-4 text-brand/30" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest ml-1">联动响应</label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'close_valve', label: '自动关阀' },
                  { id: 'cut_fire', label: '切断火力' },
                  { id: 'notify_user', label: '通知用户' },
                  { id: 'notify_admin', label: '通知管理员' },
                ].map((action) => (
                  <div key={action.id} className="flex items-center space-x-3 p-3 bg-white/5 border border-border-subtle rounded-xl">
                    <input
                      type="checkbox"
                      checked={(draft.data.actions || []).includes(action.id)}
                      onChange={(event) => {
                        updateDraft((prev) => ({
                          ...prev,
                          data: {
                            ...prev.data,
                            actions: event.target.checked
                              ? [...(prev.data.actions || []), action.id]
                              : (prev.data.actions || []).filter((value: string) => value !== action.id),
                          },
                        }));
                      }}
                      className="w-4 h-4 rounded border-border-subtle bg-black/40 text-brand focus:ring-brand"
                    />
                    <span className="text-[10px] font-mono font-bold text-text-secondary uppercase">{action.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest ml-1">风控策略名称</label>
              <input
                type="text"
                value={draft.name}
                onChange={(event) => updateDraft((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full px-4 py-3 bg-black/40 border border-border-subtle rounded-xl text-sm text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest ml-1">风险阈值</label>
                <input
                  type="text"
                  value={draft.data.threshold || ''}
                  onChange={(event) => updateDraft((prev) => ({ ...prev, data: { ...prev.data, threshold: event.target.value } }))}
                  className="w-full px-4 py-3 bg-black/40 border border-border-subtle rounded-xl text-xs font-mono text-brand focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest ml-1">执行动作</label>
                <select
                  value={draft.data.action || 'notify_only'}
                  onChange={(event) => updateDraft((prev) => ({ ...prev, data: { ...prev.data, action: event.target.value } }))}
                  className="w-full px-4 py-3 bg-black/40 border border-border-subtle rounded-xl text-sm text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all appearance-none"
                >
                  <option value="lock_device">锁定设备</option>
                  <option value="notify_only">仅通知</option>
                  <option value="limit_function">功能受限</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest ml-1">策略说明</label>
              <textarea
                rows={3}
                value={draft.data.reason || ''}
                onChange={(event) => updateDraft((prev) => ({ ...prev, data: { ...prev.data, reason: event.target.value } }))}
                className="w-full px-4 py-3 bg-black/40 border border-border-subtle rounded-xl text-sm text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all resize-none"
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="p-10 space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-black text-text-primary tracking-widest uppercase">系统配置</h2>
          <p className="text-text-secondary text-[10px] font-mono font-bold mt-1 tracking-[0.2em]">业务规则与自动化协议定义</p>
        </div>
        <div className="flex bg-black/40 p-1 rounded-xl border border-border-subtle">
          {[
            { id: 'message', label: '消息模板', icon: MessageSquare },
            { id: 'alert', label: '告警规则', icon: ShieldAlert },
            { id: 'risk', label: '风控规则', icon: ShieldCheck },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ConfigTab)}
              className={`px-6 py-2 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center space-x-2 ${activeTab === tab.id ? 'bg-brand text-black brand-glow' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="glass-dark rounded-2xl border border-danger/30 bg-danger/5 p-4 text-[10px] font-mono text-danger uppercase tracking-widest">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">现有规则 ({tabConfigs.length})</h4>
            <button
              onClick={handleAdd}
              className="p-1.5 bg-brand/10 border border-brand/20 text-brand rounded-lg hover:bg-brand hover:text-black transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
            {loading ? (
              <div className="p-4 text-[10px] font-mono text-text-secondary uppercase tracking-widest">正在加载配置...</div>
            ) : tabConfigs.map((config) => (
              <div
                key={config.id}
                onClick={() => {
                  setSelectedId(config.id);
                  setDraft(JSON.parse(JSON.stringify(config)));
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer group relative ${selectedId === config.id ? 'bg-brand/5 border-brand/50 brand-glow' : 'glass-dark border-border-subtle hover:border-brand/30'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'message' ? 'bg-brand' : activeTab === 'alert' ? 'bg-warning' : 'bg-success'}`} />
                    <p className="text-xs font-bold text-text-primary truncate max-w-[150px]">{config.name}</p>
                  </div>
                  <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(event) => handleDelete(config.id, event)}
                      className="p-1 hover:bg-danger/10 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-text-secondary hover:text-danger" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[9px] text-text-secondary font-mono uppercase tracking-tighter">{config.id}</p>
                  <p className="text-[9px] text-text-secondary font-mono">{formatTime(config.updatedAt).split(' ')[0]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 glass-dark rounded-3xl border border-border-subtle p-8 flex flex-col min-h-[600px]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                <Edit3 className="w-5 h-5 text-brand" />
              </div>
              <div>
                <h3 className="text-sm font-display font-bold text-text-primary tracking-widest uppercase">
                  {selectedId ? '编辑配置协议' : '选择协议'}
                </h3>
                <p className="text-[9px] font-mono text-text-secondary uppercase tracking-widest">
                  {selectedId ? `ID: ${selectedId}` : '未选择任何项'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {showSuccess && (
                <div className="flex items-center space-x-2 text-success animate-in fade-in slide-in-from-right-4">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-[10px] font-mono font-bold uppercase">保存成功</span>
                </div>
              )}
              <button
                onClick={handleSave}
                disabled={!selectedId || isSaving}
                className="px-6 py-2 bg-brand text-black rounded-xl font-mono font-bold text-[10px] brand-glow hover:bg-brand/80 transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Clock className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{isSaving ? '正在保存...' : '保存配置'}</span>
              </button>
            </div>
          </div>

          <div className="flex-1">
            {renderEditor()}
          </div>

          {selectedId && (
            <div className="mt-8 space-y-4">
              <div className="p-6 bg-white/5 rounded-2xl border border-border-subtle">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Play className="w-4 h-4 text-brand" />
                    <h4 className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">模拟测试环境</h4>
                  </div>
                  <span className="text-[9px] font-mono text-text-secondary uppercase tracking-widest">Sandbox Mode</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                    <input
                      type="text"
                      placeholder="输入测试设备 SN 或手机号..."
                      value={testInput}
                      onChange={(event) => setTestInput(event.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-black/40 border border-border-subtle rounded-xl text-[10px] font-mono text-text-primary outline-none focus:border-brand/50 transition-all"
                    />
                  </div>
                  <button
                    onClick={handleRunSimulation}
                    disabled={isSimulating}
                    className="px-6 py-2 border border-brand/50 text-brand rounded-xl text-[10px] font-mono font-bold hover:bg-brand/10 transition-all flex items-center space-x-2 disabled:opacity-50"
                  >
                    {isSimulating ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    <span>{isSimulating ? '模拟中...' : '运行模拟'}</span>
                  </button>
                </div>
              </div>

              {(simulationLog.length > 0 || isSimulating) && (
                <div className="p-4 bg-black/60 border border-border-subtle rounded-2xl font-mono text-[9px] space-y-1 max-h-40 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-2">
                  {simulationLog.map((log, index) => (
                    <div key={index} className={`${log.includes('成功') ? 'text-success' : log.includes('正在') ? 'text-brand' : 'text-text-secondary'}`}>
                      {log}
                    </div>
                  ))}
                  {isSimulating && <div className="text-brand animate-pulse">_</div>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {idToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-dark border border-border-subtle w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-danger" />
                </div>
                <h3 className="text-lg font-display font-bold text-text-primary tracking-widest uppercase">确认删除</h3>
              </div>
              <button
                onClick={() => setIdToDelete(null)}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors text-text-secondary hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-text-secondary leading-relaxed mb-8">
              您确定要删除配置协议 <span className="text-text-primary font-bold">"{configs.find((config) => config.id === idToDelete)?.name}"</span> 吗？此操作不可撤销。
            </p>

            <div className="flex space-x-4">
              <button
                onClick={() => setIdToDelete(null)}
                className="flex-1 px-6 py-3 rounded-xl border border-border-subtle text-[10px] font-mono font-bold text-text-secondary hover:bg-white/5 transition-all uppercase tracking-widest"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-6 py-3 rounded-xl bg-danger text-white text-[10px] font-mono font-bold hover:bg-danger/80 transition-all uppercase tracking-widest shadow-lg shadow-danger/20"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
