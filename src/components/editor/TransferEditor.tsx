import { useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { generateAvatar } from '@/utils/avatar';
import type { Message, TransferData } from '@/types';

interface TransferEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TransferEditor({ isOpen, onClose }: TransferEditorProps) {
  const { project, addMessage } = useChatStore();
  const [amount, setAmount] = useState('10000');
  const [note, setNote] = useState('');
  const [sender, setSender] = useState(project.users[0]?.name || '用户A');
  const [isReceived, setIsReceived] = useState(false);

  const handleSubmit = () => {
    if (parseInt(amount) <= 0) return;

    const transferData: TransferData = {
      amount: parseInt(amount),
      note: note.trim() || undefined,
      isReceived: isReceived,
      sender: sender,
    };

    const user = project.users.find(u => u.name === sender);

    const newMessage: Omit<Message, 'id'> = {
      role: user?.role || 'user',
      sender: sender,
      avatar: user?.avatar || generateAvatar(sender),
      content: `转账 ¥${(parseInt(amount) / 100).toFixed(2)}`,
      type: 'transfer',
      timestamp: Date.now(),
      transfer: transferData,
    };

    addMessage(newMessage);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-[400px] max-w-[90%]">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">插入转账</h3>
        
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
          <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">转账说明（可选）</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例如：午饭钱"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>

        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isReceived}
              onChange={(e) => setIsReceived(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">已收款</span>
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
