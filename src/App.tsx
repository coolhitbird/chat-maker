import { useState, useRef } from 'react';
import { useChatStore, ExportableProject } from '@/stores/chatStore';
import MessageList from '@/components/editor/MessageList';
import MessageInput from '@/components/editor/MessageInput';
import TextImporter from '@/components/editor/TextImporter';
import UserManager from '@/components/editor/UserManager';
import Preview from '@/components/preview/Preview';

function App() {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [importStatus, setImportStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { project, updateChatTitle, exportProject, importProject } = useChatStore();

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
        const data = JSON.parse(content) as ExportableProject;
        
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
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">Chat Maker</h1>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {(['editor', 'preview'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
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
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold mb-4">消息列表</h2>
                <MessageList />
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold mb-4">添加消息</h2>
                <MessageInput />
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold mb-4">用户管理</h2>
                <UserManager />
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold mb-4">批量导入</h2>
                <TextImporter />
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold mb-4">快捷操作</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">聊天标题</label>
                    <input
                      type="text"
                      value={project.chatTitle}
                      onChange={e => updateChatTitle(e.target.value)}
                      placeholder="显示在聊天顶部的标题"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      importStatus.includes('成功') ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
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
