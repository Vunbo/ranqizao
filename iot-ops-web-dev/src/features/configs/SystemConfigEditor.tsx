import {
  Mail,
  MessageSquare,
  Settings,
  Smartphone,
  Zap,
} from 'lucide-react';
import type { OpsConfigItem } from '../../types';
import type { ConfigTab } from './system-config.types';

interface SystemConfigEditorProps {
  activeTab: ConfigTab;
  draft: OpsConfigItem | null;
  updateDraft: (updater: (prev: OpsConfigItem) => OpsConfigItem) => void;
}

export function SystemConfigEditor({
  activeTab,
  draft,
  updateDraft,
}: SystemConfigEditorProps) {
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
}
