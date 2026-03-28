import type { SystemData } from '@/types';

interface SystemProps {
  data: SystemData;
  isUser?: boolean;
  scale?: number;
}

export default function System({ 
  data, 
  isUser: _isUser,
  scale = 1 
}: SystemProps) {
  const { text, type = 'info' } = data;

  const getStyle = () => {
    switch (type) {
      case 'recall': // 撤回消息 - 灰色斜体
        return {
          backgroundColor: '#f5f5f5',
          color: '#999',
          fontStyle: 'italic',
          icon: '↩️',
        };
      case 'pat': // 拍一拍 - 浅黄色
        return {
          backgroundColor: '#fff8e1',
          color: '#ff9800',
          fontStyle: 'normal',
          icon: '🤚',
        };
      case 'addFriend': // 添加好友 - 浅蓝色
        return {
          backgroundColor: '#e3f2fd',
          color: '#1976d2',
          fontStyle: 'normal',
          icon: '👤',
        };
      case 'invite': // 邀请进群 - 浅绿色
        return {
          backgroundColor: '#e8f5e9',
          color: '#388e3c',
          fontStyle: 'normal',
          icon: '👥',
        };
      case 'warning':
        return {
          backgroundColor: '#fff3cd',
          color: '#856404',
          fontStyle: 'normal',
          icon: '⚠️',
        };
      case 'notification':
        return {
          backgroundColor: '#fff3e0',
          color: '#e65100',
          fontStyle: 'normal',
          icon: '📢',
        };
      default:
        return {
          backgroundColor: '#f0f0f0',
          color: '#666',
          fontStyle: 'normal',
          icon: 'ℹ️',
        };
    }
  };

  const style = getStyle();

  return (
    <div style={{
      textAlign: 'center',
      margin: `${8 * scale}px 0`,
    }}>
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: `${4 * scale}px`,
        padding: `${6 * scale}px ${16 * scale}px`,
        backgroundColor: style.backgroundColor,
        borderRadius: 12 * scale,
        fontSize: 12 * scale,
        color: style.color,
        fontStyle: style.fontStyle,
      }}>
        <span>{style.icon}</span>
        <span>{text}</span>
      </span>
    </div>
  );
}
