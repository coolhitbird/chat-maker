import { useState, useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import MessageList from '@/components/editor/MessageList';
import MessageInput from '@/components/editor/MessageInput';
import TextImporter from '@/components/editor/TextImporter';
import UserManager from '@/components/editor/UserManager';
import ProjectList from '@/components/editor/ProjectList';
import Preview from '@/components/preview/Preview';
import type { Message } from '@/types';

function App() {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('');
  const [quoteMessage, setQuoteMessage] = useState<Message | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const { userSettings, saveCurrentProject, updateUserSettings } = useChatStore();

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
    const handleBeforeUnload = () => {
      saveCurrentProject();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveCurrentProject]);

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

  // 监听存储警告事件
  useEffect(() => {
    const handleStorageWarning = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setStorageWarning(detail?.message || '存储空间不足');
      setTimeout(() => setStorageWarning(null), 8000);
    };
    window.addEventListener('chatmaker:storage-warning', handleStorageWarning);
    return () => window.removeEventListener('chatmaker:storage-warning', handleStorageWarning);
  }, []);

  const toggleTheme = () => {
    updateUserSettings({ theme: isDark ? 'light' : 'dark' });
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
                <MessageList onQuote={(msg) => setQuoteMessage(msg)} />
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">添加消息</h2>
                <MessageInput
                  quoteMessage={quoteMessage}
                  onClearQuote={() => setQuoteMessage(null)}
                />
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
            </div>
          </div>
        )}

        {activeTab === 'preview' && <Preview />}

        {/* 始终渲染隐藏的预览容器，用于视频导出 */}
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <Preview />
        </div>
      </main>

      {/* 存储空间警告 */}
      {storageWarning && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-red-50 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-lg shadow-lg p-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <span className="text-red-500 text-lg">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">存储空间警告</p>
              <p className="text-xs text-red-600 dark:text-red-300 mt-1">{storageWarning}</p>
            </div>
            <button
              onClick={() => setStorageWarning(null)}
              className="text-red-400 hover:text-red-600 dark:hover:text-red-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
