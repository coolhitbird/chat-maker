import { useState, useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { generateAvatar } from '@/utils/avatar';
import type { Message } from '@/types';

interface ImageEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageEditor({ isOpen, onClose }: ImageEditorProps) {
  const { project, addMessage } = useChatStore();
  const [sender, setSender] = useState(project.users[0]?.name || '');
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // 项目切换时同步 sender 到第一个用户
  useEffect(() => {
    if (project.users[0]) setSender(project.users[0].name);
  }, [project.id]);  const handleSubmit = () => {
    if (!imageUrl.trim() && !caption.trim()) return;

    const user = project.users.find(u => u.name === sender);

    const newMessage: Omit<Message, 'id'> = {
      role: user?.role || 'user',
      sender: sender,
      avatar: user?.avatar || generateAvatar(sender),
      content: caption.trim() || '[图片]',
      type: 'image',
      timestamp: Date.now(),
      image: {
        url: imageUrl.trim(),
        caption: caption.trim() || undefined,
      },
    };

    addMessage(newMessage);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-[400px] max-w-[90%]">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">插入图片</h3>
        
        <div className="mb-4">
          <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">发送者</label>
          <select
            value={sender}
            onChange={(e) => setSender(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            {project.users.map(user => (
              <option key={user.id} value={user.name}>{user.name}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">上传图片</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
          {imageUrl && (
            <div className="mt-2">
              <img 
                src={imageUrl} 
                alt="预览"
                className="max-w-full max-h-[100px] rounded-lg border border-gray-300 dark:border-gray-600"
              />
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">或输入图片URL</label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">图片说明（可选）</label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="例如：这是我的照片"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>

        {imageUrl && (
          <div className="mb-4">
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">预览</label>
            <div 
              className="w-full h-[150px] rounded-lg border border-gray-300 dark:border-gray-600 bg-cover bg-center"
              style={{ backgroundImage: `url(${imageUrl})` }}
            />
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!imageUrl && !caption}
            className="px-4 py-2 rounded-lg bg-green-500 text-white text-sm hover:bg-green-600 disabled:opacity-50"
          >
            插入
          </button>
        </div>
      </div>
    </div>
  );
}
