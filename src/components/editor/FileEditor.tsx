import { useState, useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { generateAvatar } from '@/utils/avatar';
import type { Message, FileData } from '@/types';

interface FileEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

const FILE_TYPES = [
  { ext: 'PDF', label: 'PDF 文档', icon: '📄' },
  { ext: 'DOCX', label: 'Word 文档', icon: '📝' },
  { ext: 'XLSX', label: 'Excel 表格', icon: '📊' },
  { ext: 'PPTX', label: 'PPT 演示', icon: '📋' },
  { ext: 'ZIP', label: '压缩包', icon: '🗜️' },
  { ext: 'MP4', label: '视频', icon: '🎬' },
  { ext: 'MP3', label: '音频', icon: '🎵' },
  { ext: 'TXT', label: '文本文件', icon: '📃' },
];

export default function FileEditor({ isOpen, onClose }: FileEditorProps) {
  const { project, addMessage } = useChatStore();
  const [sender, setSender] = useState(project.users[0]?.name || '');
  const [fileName, setFileName] = useState('文档.pdf');
  const [fileSize, setFileSize] = useState('2.5 MB');
  const [fileType, setFileType] = useState('PDF');

  // 项目切换时同步 sender 到第一个用户
  useEffect(() => {
    if (project.users[0]) setSender(project.users[0].name);
  }, [project.id]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!fileName.trim()) return;

    const user = project.users.find(u => u.name === sender);
    const fileData: FileData = {
      name: fileName.trim(),
      size: fileSize.trim() || '未知大小',
      type: fileType,
    };

    const newMessage: Omit<Message, 'id'> = {
      role: user?.role || 'user',
      sender: sender,
      avatar: user?.avatar || generateAvatar(sender),
      content: `[文件 ${fileName.trim()}]`,
      type: 'file',
      timestamp: Date.now(),
      file: fileData,
    };

    addMessage(newMessage);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-[380px] max-w-[90%]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">插入文件消息</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">发送者</label>
            <select
              value={sender}
              onChange={e => setSender(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              {project.users.map(user => (
                <option key={user.id} value={user.name}>{user.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-2">文件类型</label>
            <div className="grid grid-cols-4 gap-2">
              {FILE_TYPES.map(ft => (
                <button
                  key={ft.ext}
                  type="button"
                  onClick={() => {
                    setFileType(ft.ext);
                    if (!fileName || fileName === '文档.pdf') {
                      setFileName(`文档.${ft.ext.toLowerCase()}`);
                    }
                  }}
                  className={`p-2 rounded-lg border text-center transition-colors ${
                    fileType === ft.ext
                      ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="text-lg">{ft.icon}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">{ft.ext}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">文件名</label>
            <input
              type="text"
              value={fileName}
              onChange={e => setFileName(e.target.value)}
              placeholder="例：项目报告.pdf"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">文件大小</label>
            <input
              type="text"
              value={fileSize}
              onChange={e => setFileSize(e.target.value)}
              placeholder="例：2.5 MB"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>

          {/* 预览 */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" className="text-gray-500 dark:text-gray-300">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{fileName || '文件名'}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{fileSize} · {fileType}</div>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={!fileName.trim()}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50"
            >
              插入
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
