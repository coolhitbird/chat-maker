import type { ImageData } from '../types';

interface ImageProps {
  data: ImageData;
  isUser?: boolean;
  scale?: number;
}

export default function Image({ 
  data, 
  isUser: _isUser,
  scale = 1 
}: ImageProps) {
  const { url = '', caption } = data;
  const size = 200 * scale; // 固定正方形尺寸

  return (
    <div style={{
      borderRadius: 8 * scale,
      overflow: 'hidden',
      maxWidth: size,
      backgroundColor: '#f0f0f0',
    }}>
      {/* 图片 */}
      <div style={{
        width: size,
        height: size,
        backgroundColor: url ? '#000' : '#e8e8e8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {url ? (
          <img 
            src={url}
            alt="图片"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div style={{ textAlign: 'center' }}>
            <svg width={48 * scale} height={48 * scale} viewBox="0 0 24 24" fill="#ccc">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
            </svg>
          </div>
        )}
      </div>
      
      {/* 图片说明 */}
      {caption && (
        <div style={{
          padding: `${6 * scale}px`,
          fontSize: 12 * scale,
          color: '#666',
          backgroundColor: '#f8f8f8',
          borderTop: '1px solid #e0e0e0',
        }}>
          {caption}
        </div>
      )}
    </div>
  );
}
