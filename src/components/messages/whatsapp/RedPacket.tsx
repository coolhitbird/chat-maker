import type { RedPacketComponentProps } from '../types';

// WhatsApp 红包样式（简化版）
export default function WhatsAppRedPacket({ 
  data, 
  scale = 1 
}: RedPacketComponentProps) {
  const { greeting, isOpened } = data;
  // amount 用于以后显示金额（预留）

  return (
    <div style={{
      width: 180 * scale,
      borderRadius: 12 * scale,
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }}>
      {/* 红色渐变头部 */}
      <div style={{
        background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)',
        padding: `${16 * scale}px`,
        display: 'flex',
        alignItems: 'center',
        gap: `${10 * scale}px`,
      }}>
        <div style={{
          width: 40 * scale,
          height: 40 * scale,
          borderRadius: '50%',
          background: '#FFD700',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18 * scale,
          color: '#fff',
        }}>
          🧧
        </div>
        
        <div>
          <div style={{
            color: '#fff',
            fontSize: 15 * scale,
            fontWeight: 'bold',
          }}>
            红包
          </div>
          <div style={{
            color: 'rgba(255,255,255,0.9)',
            fontSize: 11 * scale,
            marginTop: 4 * scale,
          }}>
            {greeting || '恭喜发财，大吉大利'}
          </div>
        </div>
      </div>

      {/* 白色底部 */}
      <div style={{
        background: '#fff',
        padding: `${8 * scale}px`,
        textAlign: 'center',
        borderTop: '1px solid #f0f0f0',
      }}>
        <div style={{
          color: '#666',
          fontSize: 11 * scale,
        }}>
          {isOpened ? '已领取' : '点击领取'}
        </div>
      </div>
    </div>
  );
}
