import { type AdminAuthUser } from '../../../shared/admin-auth';
import { HttpError } from '../../../shared/http';
import { createOpsConfigItem, updateOpsConfigItem } from './config-mutations';
import { deleteOpsConfigItem, listOpsConfigItems } from './config-repository';
import type { ConfigKind } from './config.types';

export { createOpsConfigItem, deleteOpsConfigItem, listOpsConfigItems, updateOpsConfigItem };

export async function simulateOpsConfig(input: {
  type: 'message' | 'alert' | 'risk';
  configId: string;
  target: string;
}) {
  const configMap = {
    message: 'templates',
    alert: 'alert-rules',
    risk: 'risk-rules',
  } as const;

  const kind = configMap[input.type];
  const items = await listOpsConfigItems(kind);
  const selectedItem = items.find((item: any) => item.id === input.configId) || null;

  if (!selectedItem) {
    throw new HttpError(404, '模拟目标配置不存在。');
  }

  const logs = [
    `[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] 正在初始化沙盒环境...`,
    `[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] 正在加载规则: ${selectedItem.name} (${selectedItem.id})`,
    `[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] 正在获取目标 ${input.target} 的状态快照...`,
    `[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] 状态匹配中: ${input.type === 'alert' ? selectedItem.data.condition : input.type === 'risk' ? selectedItem.data.threshold : '渲染消息模板'}`,
    `[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] 模拟匹配成功！`,
    `[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] 正在执行动作: ${input.type === 'alert' ? (selectedItem.data.actions || []).join(', ') : input.type === 'risk' ? selectedItem.data.action : (selectedItem.data.channels || []).join(', ')}`,
    `[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] 模拟运行完成。`,
  ];

  return {
    ok: true,
    logs,
  };
}

export type { AdminAuthUser, ConfigKind };
