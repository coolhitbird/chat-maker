import { useChatStore } from '@/stores/chatStore';
import type { Message } from '@/types';
import MessageContent from '@/components/common/MessageContent';
import { defaultLayoutConfig } from '@/core/messageLayout';

interface MessageItemProps {
  message: Message;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const AVATAR_SIZE = 40;

export default function MessageItem({ message, onDelete, onMoveUp, onMoveDown }: MessageItemProps) {
  const { project } = useChatStore();
  const user = project.users.find(u => u.name === message.sender);
  const avatar = user?.avatar || message.avatar;
  const isUser = message.role === 'user';

  const senderHeight = AVATAR_SIZE * defaultLayoutConfig.avatarSection.senderName.heightRatio;

  return (
    <div className={`flex items-start gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors ${isUser ? 'flex-row-reverse' : ''}`}>
      <img src={avatar} alt={message.sender} className="w-10 h-10 rounded-full flex-shrink-0 self-start" />
      <div className={`flex-1 flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div className="text-xs text-gray-400" style={{ height: senderHeight, display: 'flex', alignItems: 'flex-end' }}>
          {message.sender}
        </div>
        <div className={`inline-block px-3 py-2 rounded-lg max-w-full ${
          isUser ? 'bg-green-200' : 'bg-white'
        }`}>
          <div className="text-sm"><MessageContent content={message.content} /></div>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <button onClick={onMoveUp} className="text-gray-400 hover:text-gray-600">↑</button>
        <button onClick={onDelete} className="text-red-400 hover:text-red-600">×</button>
        <button onClick={onMoveDown} className="text-gray-400 hover:text-gray-600">↓</button>
      </div>
    </div>
  );
}
