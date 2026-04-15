import type { FileData } from '@/types';

interface FileProps {
  data: FileData;
  isUser?: boolean;
  scale?: number;
}

export default function File({ 
  data, 
  isUser = false,
  scale = 1 
}: FileProps) {
  const { name, size, type, url: _url } = data;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: `${12 * scale}px`,
      padding: `${12 * scale}px`,
      backgroundColor: isUser ? 'rgba(0,0,0,0.08)' : '#FFFFFF',
      borderRadius: 8 * scale,
      border: `1px solid ${isUser ? 'rgba(255,255,255,0.2)' : '#E0E0E0'}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      cursor: 'pointer',
      minWidth: `${160 * scale}px`,
    }}>
      {/* 文件图标 */}
      <div style={{
        width: 40 * scale,
        height: 40 * scale,
        backgroundColor: isUser ? 'rgba(255,255,255,0.25)' : '#EEF2FF',
        borderRadius: 8 * scale,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <svg width={24 * scale} height={24 * scale} viewBox="0 0 24 24" fill={isUser ? '#fff' : '#4F46E5'}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
        </svg>
      </div>
      
      {/* 文件信息 */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
      }}>
        <div style={{
          fontSize: 14 * scale,
          color: isUser ? '#fff' : '#333',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {name}
        </div>
        <div style={{
          fontSize: 12 * scale,
          color: isUser ? 'rgba(255,255,255,0.7)' : '#999',
          marginTop: `${2 * scale}px`,
        }}>
          {type && `${type} · `}{size}
        </div>
      </div>
      
      {/* 下载图标 */}
      <svg width={20 * scale} height={20 * scale} viewBox="0 0 24 24" fill={isUser ? '#fff' : '#666'}>
        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
      </svg>
    </div>
  );
}
