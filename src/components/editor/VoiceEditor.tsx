import { useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { generateAvatar } from '@/utils/avatar';
import type { Message, VoiceData } from '@/types';

interface VoiceEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VoiceEditor({ isOpen, onClose }: VoiceEditorProps) {
  const { project, addMessage } = useChatStore();
  const [sender, setSender] = useState(project.users[0]?.name || '用户A');
  const [duration, setDuration] = useState(5);
  const [text, setText] = useState('');

  const handleSubmit = () => {
    const voiceData: VoiceData = {
      duration: duration,
      text: text.trim() || undefined,
    };

    const user = project.users.find(u => u.name === sender);

    const newMessage: Omit<Message, 'id'> = {
      role: user?.role || 'user',
      sender: sender,
      avatar: user?.avatar || generateAvatar(sender),
      content: text.trim() || `[语音 ${duration}"]`,
      type: 'voice',
      timestamp: Date.now(),
      voice: voiceData,
    };

    addMessage(newMessage);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-[350px] max-w-[90%]">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">插入语音</h3>
        
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
          <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
            语音时长：{duration}秒
          </label>
          <input
            type="range"
            min="1"
            max="60"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>1秒</span>
            <span>60秒</span>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">语音内容（可选）</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="请输入语音内容..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
          />
        </div>

        <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center gap-2">
          <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" className="text-gray-600 dark:text-gray-300">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <div className="flex-1 flex gap-[2px] items-center h-5">
            {Array.from({ length: 20 }, (_, i) => (
              <div
                key={i}
                className="w-[3px] bg-gray-400 dark:bg-gray-500 rounded-sm"
                style={{ height: `${Math.random() * 14 + 6}px` }}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">{duration}"</span>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg bg-green-500 text-white text-sm hover:bg-green-600"
          >
            插入
          </button>
        </div>
      </div>
    </div>
  );
}
