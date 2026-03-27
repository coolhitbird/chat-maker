import { useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { generateAvatar } from '@/utils/avatar';
import type { Message } from '@/types';

interface ImageEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageEditor({ isOpen, onClose }: ImageEditorProps) {
  const { project, addMessage } = useChatStore();
  const [sender, setSender] = useState(project.users[0]?.name || '用户A');
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const handleSubmit = () => {
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
        <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>插入图片</h3>
        
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

        {/* 图片上传 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14, color: '#666' }}>上传图片</label>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{
          width: '100%',
          padding: 8,
          borderRadius: 6,
          border: '1px solid #ddd',
          fontSize: 14,
        }}
      />
      {imageUrl && (
        <div style={{ marginTop: 8 }}>
          <img 
            src={imageUrl} 
            alt="预览"
            style={{
              maxWidth: '100%',
              maxHeight: 100,
              borderRadius: 6,
              border: '1px solid #ddd',
            }}
          />
        </div>
      )}
        </div>

        {/* 图片URL */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14, color: '#666' }}>或输入图片URL</label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            style={{
              width: '100%',
              padding: 8,
              borderRadius: 6,
              border: '1px solid #ddd',
              fontSize: 14,
            }}
          />
        </div>

        {/* 图片说明 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14, color: '#666' }}>图片说明（可选）</label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="例如：这是我的照片"
            style={{
              width: '100%',
              padding: 8,
              borderRadius: 6,
              border: '1px solid #ddd',
              fontSize: 14,
            }}
          />
        </div>

        {/* 预览 */}
        {imageUrl && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, color: '#666' }}>预览</label>
            <div style={{
              width: '100%',
              height: 150,
              background: `url(${imageUrl}) center/cover`,
              borderRadius: 6,
              border: '1px solid #ddd',
            }} />
          </div>
        )}

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
            disabled={!imageUrl && !caption}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              background: '#07c160',
              color: '#fff',
              fontSize: 14,
              cursor: 'pointer',
              opacity: (!imageUrl && !caption) ? 0.5 : 1,
            }}
          >
            插入
          </button>
        </div>
      </div>
    </div>
  );
}
