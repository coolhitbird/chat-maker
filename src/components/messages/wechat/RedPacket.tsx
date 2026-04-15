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
      {/* 红包头部 - 红色渐变 */}
      <div style={{
        background: redPacketStyleConfig.headerBg,
        padding: `${14 * scale}px ${12 * scale}px`,
        display: 'flex',
        alignItems: 'center',
        gap: `${10 * scale}px`,
        minHeight: 60 * scale,
      }}>
        {/* 红包图标 - 金色圆形 + ¥ 符号 */}
        <div style={{
          width: 42 * scale,
          height: 42 * scale,
          background: redPacketStyleConfig.iconColor,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
          fontSize: `${20 * scale}px`,
          lineHeight: 1,
        }}>
          🧧
        </div>
        
        {/* 红包内容 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: redPacketStyleConfig.titleColor,
            fontSize: 15 * scale,
            fontWeight: 'bold',
            letterSpacing: '0.5px',
          }}>
            微信红包
          </div>
          <div style={{
            color: redPacketStyleConfig.amountColor,
            fontSize: 12 * scale,
            marginTop: 3 * scale,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {greeting || '恭喜发财，大吉大利'}
          </div>
        </div>
      </div>
      
      {/* 红包底部 */}
      <div style={{
        background: redPacketStyleConfig.footerBg,
        padding: `${7 * scale}px ${12 * scale}px`,
        textAlign: 'center',
        borderTop: `1px solid ${isOpened ? '#f0e0e0' : '#f0e0e0'}`,
      }}>
        <div style={{
          color: redPacketStyleConfig.footerColor,
          fontSize: 12 * scale,
          fontWeight: isOpened ? 500 : 400,
        }}>
          {isOpened ? `已领取 ¥${(amount / 100).toFixed(2)}` : '领取红包'}
        </div>
      </div>
    </div>
  );
}
