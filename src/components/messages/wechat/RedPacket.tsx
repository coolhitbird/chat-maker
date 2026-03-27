import type { RedPacketComponentProps, MessageStyleConfig } from '../types';
import { redPacketStyle } from './styles';

// 默认微信红包样式
const defaultStyle: MessageStyleConfig = redPacketStyle;

export default function RedPacket({ 
  data, 
  style = defaultStyle,
  scale = 1 
}: RedPacketComponentProps) {
  const { amount, greeting, isOpened } = data;
  
  // 获取样式配置
  const containerStyle = style.container || defaultStyle.container!;
  const redPacketStyleConfig = style.redPacket || defaultStyle.redPacket!;

  return (
    <div style={{
      ...containerStyle,
      width: (containerStyle.maxWidth || 200) * scale,
      overflow: 'hidden',
    }}>
      {/* 红包头部 */}
      <div style={{
        background: redPacketStyleConfig.headerBg,
        padding: `${12 * scale}px`,
        display: 'flex',
        alignItems: 'center',
        gap: `${10 * scale}px`,
      }}>
        {/* 红包图标 */}
        <div style={{
          width: 48 * scale,
          height: 48 * scale,
          background: redPacketStyleConfig.iconColor,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ fontSize: 24 * scale }}>🧧</span>
        </div>
        
        {/* 红包内容 */}
        <div style={{ flex: 1 }}>
          <div style={{
            color: redPacketStyleConfig.titleColor,
            fontSize: 16 * scale,
            fontWeight: 'bold',
          }}>
            微信红包
          </div>
          <div style={{
            color: redPacketStyleConfig.amountColor,
            fontSize: 14 * scale,
            marginTop: 4 * scale,
          }}>
            {greeting || '恭喜发财，大吉大利'}
          </div>
        </div>
      </div>
      
      {/* 红包底部 */}
      <div style={{
        background: redPacketStyleConfig.footerBg,
        padding: `${8 * scale}px ${12 * scale}px`,
        textAlign: 'center',
        borderTop: '1px solid #f0e0e0',
      }}>
        <div style={{
          color: redPacketStyleConfig.footerColor,
          fontSize: 12 * scale,
        }}>
          {isOpened ? `已领取 ¥${(amount / 100).toFixed(2)}` : '领取红包'}
        </div>
      </div>
    </div>
  );
}
