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
  const [duration, setDuration] = useState(5); // 默认5秒
  const [text, setText] = useState(''); // 转文字内容

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
      content: text.trim() || `[语音 ${duration}"]'`,
      type: 'voice',
      timestamp: Date.now(),
      voice: voiceData,
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
        width: 350,
        maxWidth: '90%',
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>插入语音</h3>
        
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

        {/* 语音时长 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14, color: '#666' }}>
            语音时长：{duration}秒
          </label>
          <input
            type="range"
            min="1"
            max="60"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#999' }}>
            <span>1秒</span>
            <span>60秒</span>
          </div>
        </div>

        {/* 语音文字 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14, color: '#666' }}>语音内容（可选）</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="请输入语音内容..."
            rows={2}
            style={{
              width: '100%',
              padding: 8,
              borderRadius: 6,
              border: '1px solid #ddd',
              fontSize: 14,
              resize: 'none',
            }}
          />
        </div>

        {/* 预览 */}
        <div style={{ 
          marginBottom: 16, 
          padding: 12,
          background: '#f5f5f5',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="#333">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <div style={{ flex: 1, display: 'flex', gap: 2, alignItems: 'center', height: 20 }}>
            {Array.from({ length: 20 }, (_, i) => (
              <div
                key={i}
                style={{
                  width: 3,
                  height: Math.random() * 14 + 6,
                  background: '#999',
                  borderRadius: 1,
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: 12, color: '#666' }}>{duration}"'</span>
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
