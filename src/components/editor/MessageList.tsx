import { useChatStore } from '@/stores/chatStore';
import MessageItem from './MessageItem';

export default function MessageList() {
  const { project, deleteMessage, reorderMessages } = useChatStore();
  const messages = project.messages;

  if (messages.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        暂无消息，请添加或导入对话内容
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {messages.map((message, index) => (
        <MessageItem
          key={message.id}
          message={message}
          onDelete={() => deleteMessage(message.id)}
          onMoveUp={() => index > 0 && reorderMessages(index, index - 1)}
          onMoveDown={() => index < messages.length - 1 && reorderMessages(index, index + 1)}
        />
      ))}
    </div>
  );
}
