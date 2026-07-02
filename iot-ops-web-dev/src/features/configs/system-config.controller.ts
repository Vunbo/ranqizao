import { configsApi, resolveConfigPath, type OpsConfigItem, type ConfigTab } from '../../lib/api-configs';
import { buildEmptyConfig } from './system-config.helpers';
import { type MouseEvent, useEffect, useMemo, useState } from 'react';

export function useSystemConfigController() {
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

  const tabConfigs = useMemo(
    () => configs.filter((config) => config.type === activeTab),
    [configs, activeTab]
  );

  const loadConfigs = async (tab: ConfigTab) => {
    setLoading(true);
    setError('');
    try {
      const result = await configsApi.list(tab);
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
        await configsApi.create(activeTab, body);
      } else {
        await configsApi.update(activeTab, draft.id, body);
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

  const handleDelete = (id: string, event: MouseEvent) => {
    event.stopPropagation();
    setIdToDelete(id);
  };

  const confirmDelete = async () => {
    if (!idToDelete) {
      return;
    }

    try {
      if (!idToDelete.startsWith('temp-')) {
        await configsApi.remove(activeTab, idToDelete);
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
      const result = await configsApi.simulate(activeTab, testInput);
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

  const selectConfig = (config: OpsConfigItem) => {
    setSelectedId(config.id);
    setDraft(JSON.parse(JSON.stringify(config)));
  };

  return {
    activeTab,
    configs,
    selectedId,
    draft,
    isSaving,
    showSuccess,
    isSimulating,
    simulationLog,
    testInput,
    idToDelete,
    loading,
    error,
    tabConfigs,
    setActiveTab,
    setTestInput,
    setIdToDelete,
    handleSave,
    handleDelete,
    confirmDelete,
    handleAdd,
    handleRunSimulation,
    updateDraft,
    selectConfig,
  };
}
