import { parseEmoji } from '@/utils/emoji';

interface MessageContentProps {
  content: string;
  className?: string;
}

export default function MessageContent({ content, className = '' }: MessageContentProps) {
  const parts = parseEmoji(content);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (typeof part === 'string') {
          return part;
        }
        return (
          <img
            key={index}
            src={part.emoji.url}
            alt={part.emoji.key}
            className="inline-block w-4 h-4 mx-0.5 align-middle"
            onError={e => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        );
      })}
    </span>
  );
}
