import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit3,
  Play,
  Plus,
  Save,
  Search,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { SystemConfigEditor } from './SystemConfigEditor';
import { useSystemConfigController } from './system-config.controller';
import { CONFIG_TABS, formatTime } from './system-config.helpers';

export const SystemConfig = () => {
  const {
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
  } = useSystemConfigController();

  return (
    <div className="p-10 space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-black text-text-primary tracking-widest uppercase">系统配置</h2>
          <p className="text-text-secondary text-[10px] font-mono font-bold mt-1 tracking-[0.2em]">业务规则与自动化协议定义</p>
        </div>
        <div className="flex bg-black/40 p-1 rounded-xl border border-border-subtle">
          {CONFIG_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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
                onClick={() => selectConfig(config)}
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
            <SystemConfigEditor
              activeTab={activeTab}
              draft={draft}
              updateDraft={updateDraft}
            />
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
