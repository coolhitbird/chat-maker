import type { TransferComponentProps, MessageStyleConfig } from '../types';
import { transferStyle } from './styles';

// 默认微信转账样式
const defaultStyle: MessageStyleConfig = transferStyle;

export default function Transfer({ 
  data, 
  style = defaultStyle,
  scale = 1 
}: TransferComponentProps) {
  const { amount, note, isReceived } = data;
  
  // 获取样式配置
  const containerStyle = style.container || defaultStyle.container!;
  const transferStyleConfig = style.transfer || defaultStyle.transfer!;

  return (
    <div style={{
      ...containerStyle,
      width: (containerStyle.maxWidth || 200) * scale,
      overflow: 'hidden',
      border: '1px solid #e0e0e0',
    }}>
      {/* 主体区域 */}
      <div style={{
        background: transferStyleConfig.headerBg,
        padding: `${12 * scale}px`,
        display: 'flex',
        alignItems: 'center',
        gap: `${12 * scale}px`,
      }}>
        {/* 图标 */}
        <div style={{
          width: 44 * scale,
          height: 44 * scale,
          borderRadius: '50%',
          background: transferStyleConfig.iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ 
            color: '#fff', 
            fontSize: 20 * scale, 
            fontWeight: 'bold' 
          }}>¥</span>
        </div>
        
        {/* 内容区 */}
        <div style={{ flex: 1 }}>
          <div style={{
            color: transferStyleConfig.titleColor,
            fontSize: 14 * scale,
            fontWeight: 500,
          }}>
            转账
          </div>
          <div style={{
            color: transferStyleConfig.titleColor,
            fontSize: 20 * scale,
            fontWeight: 'bold',
            marginTop: 4 * scale,
          }}>
            ¥{(amount / 100).toFixed(2)}
          </div>
          {note && (
            <div style={{
              color: transferStyleConfig.contentColor,
              fontSize: 12 * scale,
              marginTop: 4 * scale,
            }}>
              {note}
            </div>
          )}
        </div>
      </div>

      {/* 底部状态 */}
      <div style={{
        background: transferStyleConfig.footerBg,
        padding: `${8 * scale}px ${12 * scale}px`,
        borderTop: '1px solid #e0e0e0',
        textAlign: 'center',
      }}>
        <span style={{
          color: isReceived ? '#07c160' : transferStyleConfig.footerColor,
          fontSize: 12 * scale,
        }}>
          {isReceived ? '已收款' : '待收款'}
        </span>
      </div>
    </div>
  );
}
