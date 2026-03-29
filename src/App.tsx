import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import MessageList from '@/components/editor/MessageList';
import MessageInput from '@/components/editor/MessageInput';
import TextImporter from '@/components/editor/TextImporter';
import UserManager from '@/components/editor/UserManager';
import ProjectList from '@/components/editor/ProjectList';
import Preview from '@/components/preview/Preview';

function App() {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [importStatus, setImportStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('');
  const { project, updateChatTitle, exportProject, importProject, userSettings, saveCurrentProject, updateUserSettings } = useChatStore();

  const isDark = userSettings.theme === 'dark';

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    if (!userSettings.autoSave) return;

    const interval = setInterval(() => {
      saveCurrentProject();
      setAutoSaveStatus('已自动保存');
      setTimeout(() => setAutoSaveStatus(''), 2000);
    }, userSettings.autoSaveInterval * 1000);

    return () => clearInterval(interval);
  }, [userSettings.autoSave, userSettings.autoSaveInterval, saveCurrentProject]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveCurrentProject();
        setAutoSaveStatus('已保存');
        setTimeout(() => setAutoSaveStatus(''), 2000);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveCurrentProject]);

  const toggleTheme = () => {
    updateUserSettings({ theme: isDark ? 'light' : 'dark' });
  };

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

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Chat Maker</h1>
            <div className="flex items-center gap-3">
              {autoSaveStatus && (
                <span className="text-sm text-green-600 dark:text-green-400">{autoSaveStatus}</span>
              )}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={isDark ? '切换到浅色模式' : '切换到深色模式'}
              >
                {isDark ? (
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {(['editor', 'preview'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab === 'editor' ? '编辑' : '预览 & 导出'}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'editor' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">消息列表</h2>
                <MessageList />
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">添加消息</h2>
                <MessageInput />
              </div>
            </div>
              <div className="space-y-4">
              <ProjectList />
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">用户管理</h2>
                <UserManager />
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">批量导入</h2>
                <TextImporter />
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">快捷操作</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">聊天标题</label>
                    <input
                      type="text"
                      value={project.chatTitle}
                      onChange={e => updateChatTitle(e.target.value)}
                      placeholder="显示在聊天顶部的标题"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleExport}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                    >
                      导出项目
                    </button>
                    <button
                      onClick={handleImportClick}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
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
                    <div className={`text-sm text-center py-2 rounded ${
                      importStatus.includes('成功') ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30' : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30'
                    }`}>
                      {importStatus}
                    </div>
                  )}
                  <button
                    onClick={() => useChatStore.getState().clearMessages()}
                    className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    清空所有消息
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'preview' && <Preview />}

        {/* 始终渲染隐藏的预览容器，用于视频导出 */}
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <Preview />
        </div>
      </main>
    </div>
  );
}

export default App;
