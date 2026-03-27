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
  const [amount, setAmount] = useState('10000'); // 分为单位（100元）
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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: 24,
        width: 400,
        maxWidth: '90%',
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>插入转账</h3>
        
        {/* 发送者选择 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14, color: '#666' }}>发送者</label>
          <select
            value={sender}
            onChange={(e) => setSender(e.target.value)}
            style={{
              width: '100%',
              padding: 8,
              borderRadius: 6,
              border: '1px solid #ddd',
              fontSize: 14,
            }}
          >
            {project.users.map(user => (
              <option key={user.id} value={user.name}>{user.name}</option>
            ))}
          </select>
        </div>

        {/* 金额输入 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14, color: '#666' }}>金额（分）</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            style={{
              width: '100%',
              padding: 8,
              borderRadius: 6,
              border: '1px solid #ddd',
              fontSize: 14,
            }}
          />
          <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
            ¥{(parseInt(amount) || 0) / 100} 元
          </div>
        </div>

        {/* 转账说明 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14, color: '#666' }}>转账说明（可选）</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例如：午饭钱"
            style={{
              width: '100%',
              padding: 8,
              borderRadius: 6,
              border: '1px solid #ddd',
              fontSize: 14,
            }}
          />
        </div>

        {/* 状态选择 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isReceived}
              onChange={(e) => setIsReceived(e.target.checked)}
            />
            <span style={{ fontSize: 14, color: '#666' }}>已收款</span>
          </label>
        </div>

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid #ddd',
              background: '#fff',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              background: '#07c160',
              color: '#fff',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            插入
          </button>
        </div>
      </div>
    </div>
  );
}
