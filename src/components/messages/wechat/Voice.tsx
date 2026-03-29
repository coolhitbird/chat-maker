import type { VoiceData, MessageStyleConfig } from '../types';

interface VoiceProps {
  data: VoiceData;
  isUser?: boolean;
  style?: MessageStyleConfig;
  scale?: number;
  fontSize?: number;
}

export default function Voice({ 
  data, 
  isUser = false,
  scale = 1,
  fontSize
}: VoiceProps) {
  const { duration, waveform = [], text } = data;
  // 如果没有传入fontSize，则由scale自动计算（与普通文字保持一致）
  const textFontSize = fontSize ? fontSize * scale : undefined;
  
  // DEBUG: 打印字号信息
  console.log(`[Voice Component] fontSize prop=${fontSize}, scale=${scale}, textFontSize=${textFontSize}`);
  
  // 生成随机波形数据（如果没有提供）
  const waveformData = waveform.length > 0 
    ? waveform 
    : Array.from({ length: 20 }, () => Math.random() * 0.8 + 0.2);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: `${4 * scale}px`,
      fontSize: 'inherit',
    }}>
      {/* 语音部分 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: `${8 * scale}px`,
        padding: `${8 * scale}px`,
        minWidth: `${Math.min(150, duration * 10 + 80) * scale}px`,
        cursor: 'pointer',
      }}>
        {/* 播放图标 */}
        <div style={{
          width: 20 * scale,
          height: 20 * scale,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width={16 * scale} height={16 * scale} viewBox="0 0 24 24" fill={isUser ? '#fff' : '#333'}>
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
        
        {/* 语音波形 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: `${2 * scale}px`,
          flex: 1,
          height: `${24 * scale}px`,
        }}>
          {waveformData.map((height: number, index: number) => (
            <div
              key={index}
              style={{
                width: `${3 * scale}px`,
                height: `${height * 24 * scale}px`,
                backgroundColor: isUser ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.3)',
                borderRadius: `${2 * scale}px`,
              }}
            />
          ))}
        </div>
        
        {/* 时长 */}
        <div style={{
          fontSize: 12 * scale,
          color: isUser ? 'rgba(255,255,255,0.8)' : '#999',
          flexShrink: 0,
        }}>
          {duration}"'
        </div>
      </div>

      {/* 文字内容（如果有）- 明确继承父元素字号 */}
      {text && (
        <span style={{ fontSize: 'inherit', color: 'inherit' }}>
          {text}
        </span>
      )}
    </div>
  );
}
