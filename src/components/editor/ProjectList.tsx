import { useState, useRef } from 'react';
import { useChatStore } from '@/stores/chatStore';
import type { StoredProject } from '@/types';

export default function ProjectList() {
  const {
    project,
    updateChatTitle,
    projects,
    currentProjectId,
    createProject,
    loadProject,
    deleteProject,
    duplicateProject,
    updateProjectName,
    saveCurrentProject,
    exportProject,
    importProject,
  } = useChatStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = exportProject();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-project-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);

        if (!data.version || !data.project) {
          throw new Error('无效的项目文件格式');
        }

        importProject(data);
        setImportStatus('导入成功！');
        setTimeout(() => setImportStatus(''), 3000);
      } catch (err) {
        setImportStatus('导入失败：' + (err as Error).message);
        setTimeout(() => setImportStatus(''), 5000);
      }
    };
    reader.readAsText(file);
    
    e.target.value = '';
  };

  const currentProject = projects.find((p: StoredProject) => p.id === currentProjectId);

  const handleStartEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
    setShowDropdown(false);
  };

  const handleSaveEdit = () => {
    if (editingId && editingName.trim()) {
      updateProjectName(editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditingName('');
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">项目列表</h2>
        <button
          onClick={() => createProject()}
          className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
        >
          + 新建项目
        </button>
      </div>

      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <span className="truncate">
            {currentProject?.name || '选择项目'}
          </span>
          <svg
            className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDropdown && (
          <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-80 overflow-y-auto">
            {projects.length === 0 ? (
              <div className="px-3 py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                暂无项目
              </div>
            ) : (
              projects.map((project: StoredProject) => (
                <div
                  key={project.id}
                  className={`group px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    project.id === currentProjectId ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                  } ${project.id !== currentProjectId ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      {editingId === project.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          onBlur={handleSaveEdit}
                          onKeyDown={handleKeyDown}
                          autoFocus
                          className="w-full px-2 py-1 border border-blue-500 rounded text-sm focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <button
                          onClick={() => loadProject(project.id)}
                          className="w-full text-left"
                          onDoubleClick={() => handleStartEdit(project.id, project.name)}
                        >
                          <div className="font-medium text-sm truncate text-gray-900 dark:text-white">{project.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {project.messages.length} 条消息 · {formatDate(project.updatedAt)}
                          </div>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(project.id, project.name);
                        }}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                        title="重命名"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateProject(project.id);
                        }}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                        title="复制项目"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`确定删除项目"${project.name}"吗？`)) {
                            deleteProject(project.id);
                          }
                        }}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500"
                        title="删除项目"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="mt-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">聊天标题</label>
        <input
          type="text"
          value={project.chatTitle}
          onChange={e => updateChatTitle(e.target.value)}
          placeholder="显示在聊天顶部的标题"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm"
        />
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
        <div className="flex gap-2">
          <button
            onClick={() => { saveCurrentProject(); }}
            className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            保存项目
          </button>
          <button
            onClick={handleExport}
            className="flex-1 px-3 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
          >
            导出项目
          </button>
          <button
            onClick={handleImportClick}
            className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
          >
            导入项目
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
        {importStatus && (
          <div className={`mt-2 text-xs text-center py-1 rounded ${
            importStatus.includes('成功') ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30' : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30'
          }`}>
            {importStatus}
          </div>
        )}
      </div>
    </div>
  );
}
