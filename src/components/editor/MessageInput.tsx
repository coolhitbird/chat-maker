import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import EmojiPicker from '@/components/common/EmojiPicker';

export default function MessageInput() {
  const { project, addMessage } = useChatStore();
  const [sender, setSender] = useState(project.users[0]?.name || '');
  const [content, setContent] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !sender) return;

    const user = project.users.find(u => u.name === sender);
    if (!user) return;

    addMessage({
      role: user.role,
      sender: user.name,
      avatar: user.avatar,
      content: content.trim(),
      type: 'text',
      timestamp: Date.now(),
    });

    setContent('');
  };

  const handleEmojiSelect = (emoji: string) => {
    setContent(prev => prev + emoji);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">发送者</label>
        <select
          value={sender}
          onChange={e => setSender(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {project.users.map(user => (
            <option key={user.id} value={user.name}>{user.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">消息内容</label>
        <div className="relative" ref={pickerRef}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="输入消息内容，支持微信表情如 [微笑]..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <button
            type="button"
            onClick={() => setShowEmoji(!showEmoji)}
            className="absolute right-2 bottom-2 p-1 text-gray-500 hover:text-gray-700 transition-colors"
            title="插入表情"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          {showEmoji && (
            <EmojiPicker onSelect={handleEmojiSelect} />
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          提示：输入 [微笑] 等表情代码，或点击表情按钮选择
        </p>
      </div>
      <button
        type="submit"
        disabled={!content.trim()}
        className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        添加消息
      </button>
    </form>
  );
}
