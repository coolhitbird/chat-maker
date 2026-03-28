import { useState } from 'react';
import { useChatStore } from '@/stores/chatStore';

interface SystemEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

const SYSTEM_TYPES = [
  { value: 'recall', label: '撤回消息', icon: '↩️', defaultText: '你撤回了一条消息', placeholder: '小明 撤回了一条消息' },
  { value: 'pat', label: '拍一拍', icon: '🤚', defaultText: '小明 拍了拍 小红', placeholder: '小明 拍了拍 小红' },
  { value: 'addFriend', label: '添加好友', icon: '👤', defaultText: '小明 申请添加你为好友', placeholder: '小明 申请添加你为好友' },
  { value: 'invite', label: '邀请进群', icon: '👥', defaultText: '小明 邀请 小红 加入群聊', placeholder: '小明 邀请 小红 加入群聊' },
  { value: 'info', label: '系统消息', icon: 'ℹ️', defaultText: '欢迎使用聊天生成器', placeholder: '自定义系统消息内容' },
];

export default function SystemEditor({ isOpen, onClose }: SystemEditorProps) {
  const { addMessage, project } = useChatStore();
  const [systemType, setSystemType] = useState('recall');
  const [text, setText] = useState('你撤回了一条消息');

  if (!isOpen) return null;

  const selectedType = SYSTEM_TYPES.find(t => t.value === systemType) || SYSTEM_TYPES[0];

  const handleSubmit = () => {
    if (!text.trim()) return;

    // 使用第一个用户作为发送者
    const user = project.users[0];

    addMessage({
      role: 'user',
      sender: user?.name || '系统',
      avatar: user?.avatar || '',
      content: text.trim(),
      type: 'system',
      timestamp: Date.now(),
      system: {
        text: text.trim(),
        type: systemType as 'recall' | 'pat' | 'addFriend' | 'invite' | 'info',
      },
    });

    setText(selectedType.defaultText);
    onClose();
  };

  const handleTypeChange = (type: string) => {
    setSystemType(type);
    const selected = SYSTEM_TYPES.find(t => t.value === type);
    if (selected) {
      setText(selected.defaultText);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">添加系统消息</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">消息类型</label>
            <div className="grid grid-cols-2 gap-2">
              {SYSTEM_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleTypeChange(type.value)}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    systemType === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{type.icon}</span>
                    <span className="text-sm font-medium">{type.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {selectedType.icon} {selectedType.label}内容
            </label>
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={selectedType.placeholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              提示：{selectedType.placeholder}
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              添加
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
