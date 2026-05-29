import {
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import type { OpsConfigItem } from '../../types';
import type { ConfigTab } from './system-config.types';

export interface ConfigTabOption {
  id: ConfigTab;
  label: string;
  icon: LucideIcon;
}

export const CONFIG_TABS: ConfigTabOption[] = [
  { id: 'message', label: '消息模板', icon: MessageSquare },
  { id: 'alert', label: '告警规则', icon: ShieldAlert },
  { id: 'risk', label: '风控规则', icon: ShieldCheck },
];

export function formatTime(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function buildEmptyConfig(tab: ConfigTab): OpsConfigItem {
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

export function resolveConfigPath(tab: ConfigTab) {
  if (tab === 'message') return '/ops/configs/templates';
  if (tab === 'alert') return '/ops/configs/alert-rules';
  return '/ops/configs/risk-rules';
}
