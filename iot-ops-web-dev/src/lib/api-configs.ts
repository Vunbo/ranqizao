import { api } from './api';

export interface OpsConfigItem {
  id: string;
  type: 'message' | 'alert' | 'risk';
  name: string;
  data: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ConfigTab = 'message' | 'alert' | 'risk';

export function resolveConfigPath(tab: ConfigTab): string {
  const paths: Record<ConfigTab, string> = {
    message: '/ops/configs/templates',
    alert: '/ops/configs/alert-rules',
    risk: '/ops/configs/risk-rules',
  };
  return paths[tab];
}

export const configsApi = {
  list(tab: ConfigTab): Promise<{ items: OpsConfigItem[] }> {
    return api.get<{ items: OpsConfigItem[] }>(resolveConfigPath(tab));
  },

  create(tab: ConfigTab, body: Record<string, unknown>): Promise<void> {
    return api.post(resolveConfigPath(tab), body);
  },

  update(tab: ConfigTab, id: string, body: Record<string, unknown>): Promise<void> {
    return api.put(`${resolveConfigPath(tab)}/${id}`, body);
  },

  remove(tab: ConfigTab, id: string): Promise<void> {
    return api.delete(`${resolveConfigPath(tab)}/${id}`);
  },

  simulate(type: ConfigTab, target: string): Promise<{ logs: string[] }> {
    return api.post('/ops/configs/simulate', { type, configId: '', target });
  },
};
