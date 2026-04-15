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
    }}>
      {/* 主体区域 */}
      <div style={{
        background: transferStyleConfig.headerBg,
        padding: `${14 * scale}px ${12 * scale}px`,
        display: 'flex',
        alignItems: 'center',
        gap: `${12 * scale}px`,
        minHeight: 60 * scale,
      }}>
        {/* 图标 */}
        <div style={{
          width: 42 * scale,
          height: 42 * scale,
          borderRadius: '50%',
          background: transferStyleConfig.iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}>
          <span style={{ 
            color: '#fff', 
            fontSize: 18 * scale, 
            fontWeight: 'bold' 
          }}>¥</span>
        </div>
        
        {/* 内容区 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: transferStyleConfig.titleColor,
            fontSize: 14 * scale,
            fontWeight: 500,
            letterSpacing: '0.3px',
          }}>
            微信转账
          </div>
          <div style={{
            color: transferStyleConfig.titleColor,
            fontSize: 20 * scale,
            fontWeight: 'bold',
            marginTop: 2 * scale,
          }}>
            ¥{(amount / 100).toFixed(2)}
          </div>
          {note && (
            <div style={{
              color: '#666',
              fontSize: 11 * scale,
              marginTop: 2 * scale,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {note}
            </div>
          )}
        </div>
      </div>

      {/* 底部状态 */}
      <div style={{
        background: transferStyleConfig.footerBg,
        padding: `${7 * scale}px ${12 * scale}px`,
        borderTop: '1px solid #e8e8e8',
        textAlign: 'center',
      }}>
        <span style={{
          color: isReceived ? '#07c160' : transferStyleConfig.footerColor,
          fontSize: 12 * scale,
          fontWeight: isReceived ? 500 : 400,
        }}>
          {isReceived ? '已收款' : '请确认收款'}
        </span>
      </div>
    </div>
  );
}
