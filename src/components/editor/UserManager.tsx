import { useState, useRef } from 'react';
import { useChatStore } from '@/stores/chatStore';
import type { UserProfile } from '@/types';

const avatarColors = [
  { bg: '#6366f1', name: '紫色' },
  { bg: '#8b5cf6', name: '深紫' },
  { bg: '#a855f7', name: '紫红' },
  { bg: '#d946ef', name: '粉紫' },
  { bg: '#ec4899', name: '粉色' },
  { bg: '#f43f5e', name: '玫红' },
  { bg: '#ef4444', name: '红色' },
  { bg: '#f97316', name: '橙色' },
  { bg: '#eab308', name: '黄色' },
  { bg: '#22c55e', name: '绿色' },
  { bg: '#14b8a6', name: '青色' },
  { bg: '#06b6d4', name: '蓝色' },
  { bg: '#3b82f6', name: '天蓝' },
];

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function generateLocalAvatar(name: string): string {
  const colorIndex = name.charCodeAt(0) % avatarColors.length;
  const color = avatarColors[colorIndex].bg;
  const initials = getInitials(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" fill="${color}" rx="64"/><text x="64" y="82" font-size="48" text-anchor="middle" fill="white" font-family="Arial" font-weight="bold">${initials}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

export default function UserManager() {
  const { project, addUser, updateUser, deleteUser, moveUserUp, moveUserDown } = useChatStore();
  const [newUserName, setNewUserName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [uploadingForId, setUploadingForId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    // 新用户添加到末尾，角色为 assistant
    const avatar = generateLocalAvatar(newUserName.trim());

    addUser({
      name: newUserName.trim(),
      avatar,
      role: 'assistant',
    });

    setNewUserName('');
  };

  const handleSetMainUser = (userIndex: number) => {
    if (userIndex === 0) return;
    moveUserUp(userIndex);
  };

  const handleSwapWithMain = (userIndex: number) => {
    if (userIndex <= 0) return;
    moveUserDown(userIndex - 1);
  };

  const handleStartEdit = (user: UserProfile) => {
    setEditingId(user.id);
    setEditingName(user.name);
  };

  const handleSaveEdit = (id: string) => {
    if (editingName.trim()) {
      updateUser(id, { name: editingName.trim() });
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleFileUpload = (id: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const avatar = e.target?.result as string;
      updateUser(id, { avatar });
      setUploadingForId(null);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      {/* 说明 */}
      <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/30 p-2 rounded">
        💡 点击「右侧/左侧」标签可切换当事人位置。当事人（绿色标签）显示在右侧
      </div>

      {/* 添加用户表单 */}
      <form onSubmit={handleAddUser} className="flex gap-2">
        <input
          type="text"
          value={newUserName}
          onChange={e => setNewUserName(e.target.value)}
          placeholder="输入用户名..."
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
        <button
          type="submit"
          disabled={!newUserName.trim()}
          className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50"
        >
          添加
        </button>
      </form>

      {/* 用户列表 */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {project.users.map((user, index) => (
          <div key={user.id} className={`p-2 rounded-lg ${index === 0 ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800'}`}>
            <div className="flex items-center gap-2">
              {/* 排序按钮 */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveUserUp(index)}
                  disabled={index === 0}
                  className="w-5 h-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                  title="上移"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveUserDown(index)}
                  disabled={index === project.users.length - 1}
                  className="w-5 h-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                  title="下移"
                >
                  ▼
                </button>
              </div>

              <div className="relative">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-600 shadow"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
                  }}
                />
                <button
                  onClick={() => setUploadingForId(uploadingForId === user.id ? null : user.id)}
                  className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-blue-600"
                  title="上传头像"
                >
                  📷
                </button>
              </div>
              
              {editingId === user.id ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  onBlur={() => handleSaveEdit(user.id)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveEdit(user.id)}
                  className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  autoFocus
                />
              ) : (
                <div className="flex-1 min-w-0">
                  <div 
                    className="text-sm cursor-pointer hover:text-blue-600 dark:text-gray-200 dark:hover:text-blue-400 truncate"
                    onClick={() => handleStartEdit(user)}
                  >
                    {user.name}
                    {index === 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-green-500 text-white text-xs rounded">
                        当事人
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => index === 0 ? handleSwapWithMain(index) : handleSetMainUser(index)}
                    className={`mt-0.5 px-2 py-0.5 text-xs rounded border transition-colors ${
                      index === 0 
                        ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400' 
                        : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer'
                    }`}
                    title={index === 0 ? '点击与下一位交换位置' : '点击设为当事人（显示在右侧）'}
                  >
                    {index === 0 ? '右侧 ▼' : '左侧 ▲'}
                  </button>
                </div>
              )}

              <button
                onClick={() => deleteUser(user.id)}
                className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 text-sm"
                title="删除"
                disabled={project.users.length <= 1}
              >
                ×
              </button>
            </div>

            {/* 头像上传面板 */}
            {uploadingForId === user.id && (
              <div className="mt-2 p-2 bg-white dark:bg-gray-700 rounded border dark:border-gray-600">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(user.id, file);
                  }}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                >
                  上传本地图片
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {project.users.length === 0 && (
        <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-4">
          暂无用户，请添加
        </div>
      )}
    </div>
  );
}
