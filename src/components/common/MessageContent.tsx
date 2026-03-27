import { parseEmoji } from '@/utils/emoji';
import { WechatMessages } from '@/components/messages';
import type { Message } from '@/types';

interface MessageContentProps {
  message?: Message;
  content?: string;
  className?: string;
  scale?: number;
  platform?: 'wechat' | 'dingtalk' | 'whatsapp';
}

// 获取对应平台的组件
function getComponents(platform: string) {
  switch (platform) {
    case 'wechat':
    default:
      // 使用微信组件
      return WechatMessages;
  }
}

export default function MessageContent({ 
  message, 
  content, 
  className = '',
  scale = 1,
  platform = 'wechat'
}: MessageContentProps) {
  const components = getComponents(platform);

  // 渲染消息内容
  const renderContent = () => {
    // 红包消息
    if (message?.type === 'redpacket' && message.redPacket) {
      return (
        <components.redpacket 
          data={message.redPacket} 
          isUser={message.role === 'user'}
          scale={scale}
        />
      );
    }

    // 转账消息
    if (message?.type === 'transfer' && message.transfer) {
      return (
        <components.transfer 
          data={message.transfer} 
          isUser={message.role === 'user'}
          scale={scale}
        />
      );
    }

    // 语音消息
    if (message?.type === 'voice' && message.voice) {
      // DEBUG
      console.log('[Voice] message.voice:', JSON.stringify(message.voice, null, 2));
      return (
        <components.voice 
          data={message.voice} 
          isUser={message.role === 'user'}
          scale={scale}
        />
      );
    }

    // 图片消息
    if (message?.type === 'image' && message.image) {
      return (
        <components.image 
          data={message.image} 
          isUser={message.role === 'user'}
          scale={scale}
        />
      );
    }

    // 图片消息无数据时显示占位符
    if (message?.type === 'image') {
      return (
        <span style={{ 
          padding: '4px 8px',
          background: '#e8e8e8',
          borderRadius: 8,
          display: 'inline-block',
          color: '#999',
        }}>
          📷 [图片]
        </span>
      );
    }

    // 普通文本消息
    const textContent = content || message?.content || '';
    const parts = parseEmoji(textContent);
    
    return (
      <span className={className}>
        {parts.map((part, index) => {
          if (typeof part === 'string') {
            return part;
          }
          return (
            <img 
              key={index}
              src={part.emoji.url} 
              alt={part.emoji.key}
              style={{ 
                width: 20, 
                height: 20, 
                verticalAlign: 'middle' 
              }}
            />
          );
        })}
      </span>
    );
  };

  return renderContent();
}
