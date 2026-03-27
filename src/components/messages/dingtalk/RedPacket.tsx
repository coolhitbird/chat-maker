// 钉钉红包组件
// 可以根据钉钉的实际样式调整

import type { RedPacketData } from '../types';

interface DingtalkRedPacketProps {
  data: RedPacketData;
  isUser: boolean;
  scale?: number;
}

export default function RedPacket({ data, isUser: _isUser, scale = 1 }: DingtalkRedPacketProps) {
  const { amount, greeting, isOpened } = data;

  // 钉钉风格（蓝色主题）
  return (
    <div style={{
      width: 200 * scale,
      borderRadius: 8 * scale,
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      border: '1px solid #e0e0e0',
    }}>
      {/* 主体区域 */}
      <div style={{
        background: 'linear-gradient(135deg, #1E90FF 0%, #0066FF 100%)',
        padding: `${12 * scale}px`,
        display: 'flex',
        alignItems: 'center',
        gap: 12 * scale,
      }}>
        {/* 图标 */}
        <div style={{
          width: 44 * scale,
          height: 44 * scale,
          borderRadius: '50%',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20 * scale,
          flexShrink: 0,
        }}>
          💰
        </div>
        
        {/* 内容区 */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{
            color: '#fff',
            fontSize: 16 * scale,
            fontWeight: 'bold',
            lineHeight: 1.3,
          }}>
            钉钉红包
          </div>
          <div style={{
            color: 'rgba(255,255,255,0.9)',
            fontSize: 12 * scale,
            lineHeight: 1.4,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginTop: 4 * scale,
          }}>
            {greeting || '恭喜发财，大吉大利'}
          </div>
        </div>
      </div>

      {/* 底部状态 */}
      <div style={{
        background: '#fff',
        height: 32 * scale,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderTop: '1px solid #e0e0e0',
      }}>
        <span style={{
          fontSize: 11 * scale,
          color: '#999',
        }}>
          {isOpened ? `已领取 ¥${(amount / 100).toFixed(2)}` : '领取红包'}
        </span>
      </div>
    </div>
  );
}
