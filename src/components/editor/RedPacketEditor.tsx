import { useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { generateAvatar } from '@/utils/avatar';
import type { Message, RedPacketData } from '@/types';

interface RedPacketEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RedPacketEditor({ isOpen, onClose }: RedPacketEditorProps) {
  const { project, addMessage } = useChatStore();
  const [greeting, setGreeting] = useState('恭喜发财，大吉大利');
  const [amount, setAmount] = useState('200');
  const [sender, setSender] = useState(project.users[0]?.name || '用户A');
  const [isOpened, setIsOpened] = useState(false);

  const handleSubmit = () => {
    if (!greeting.trim()) return;

    const user = project.users.find(u => u.name === sender);

    const redPacketData: RedPacketData = {
      amount: parseInt(amount) || 200,
      greeting: greeting.trim(),
      sender: sender,
      isOpened: isOpened,
    };

    const newMessage: Omit<Message, 'id'> = {
      role: user?.role || 'user',
      sender: sender,
      avatar: user?.avatar || generateAvatar(sender),
      content: greeting.trim(),
      type: 'redpacket',
      timestamp: Date.now(),
      redPacket: redPacketData,
    };

    addMessage(newMessage);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-[400px] max-w-[90%]">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">插入红包</h3>
        
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
          <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">金额（分）</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            ¥{(parseInt(amount) || 0) / 100} 元
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">祝福语</label>
          <input
            type="text"
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            placeholder="恭喜发财，大吉大利"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>

        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isOpened}
              onChange={(e) => setIsOpened(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">已领取（显示为已打开状态）</span>
          </label>
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
