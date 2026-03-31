import { useChatStore } from '@/stores/chatStore';
import MessageItem from './MessageItem';

export default function MessageList() {
  const { project, deleteMessage, reorderMessages, clearMessages } = useChatStore();
  const messages = project.messages;

  if (messages.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        暂无消息，请添加或导入对话内容
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500 dark:text-gray-400">{messages.length} 条消息</span>
        <button
          onClick={() => {
            if (confirm('确定要清空所有消息吗？')) {
              clearMessages();
            }
          }}
          className="px-3 py-1 text-xs text-red-500 hover:text-red-600 dark:text-red-400 hover:dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
        >
          清空所有
        </button>
      </div>
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
    </>
  );
}
