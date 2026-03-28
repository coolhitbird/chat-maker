import type { TimestampData } from '@/types';

interface TimestampProps {
  data: TimestampData;
  isUser?: boolean;
  scale?: number;
}

export default function Timestamp({ 
  data, 
  isUser: _isUser,
  scale = 1 
}: TimestampProps) {
  const { text } = data;

  return (
    <div style={{
      textAlign: 'center',
      margin: `${8 * scale}px 0`,
    }}>
      <span style={{
        display: 'inline-block',
        padding: `${4 * scale}px ${12 * scale}px`,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 12 * scale,
        fontSize: 11 * scale,
        color: '#999',
      }}>
        {text}
      </span>
    </div>
  );
}
