import { useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { parseConversation } from '@/core/parser';
import { generateAvatar } from '@/utils/avatar';

const sampleText = `用户A: 你好
用户B: 你好呀，很高兴认识你！
用户A: 我是来做短视频的
用户B: 哦？你做哪方面的内容？
用户A: 主要做科技数码类的
用户B: 不错哦，现在科技赛道很火 🚀
用户A: 对的，最近在做ChatGPT相关的
用户B: 那个很热门！有什么问题可以问我
用户A: 好的，谢谢！
用户B: 不客气，有问题随时问 😊`;

export default function TextImporter() {
  const { project, setMessages, addUser } = useChatStore();
  const [text, setText] = useState(sampleText);
  const [preview, setPreview] = useState<{ sender: string; content: string }[]>([]);
  const [newUsers, setNewUsers] = useState<string[]>([]);

  const handleParse = () => {
    const result = parseConversation(text, project.users);
    setPreview(result.messages.map(m => ({ sender: m.sender, content: m.content })));
    setNewUsers(result.newUsers);
  };

  const handleImport = () => {
    const result = parseConversation(text, project.users);
    
    // 自动添加新用户
    // 第一个新用户角色为 'user'（当事人，右侧）
    // 其他新用户角色为 'assistant'（左侧）
    let isFirstNewUser = result.newUsers.length > 0;
    result.newUsers.forEach((name) => {
      const role = isFirstNewUser ? 'user' : 'assistant';
      addUser({
        name,
        avatar: generateAvatar(name),
        role,
      });
      isFirstNewUser = false;
    });
    
    // 设置消息
    setMessages(result.messages);
    setPreview([]);
    setNewUsers([]);
    setText('');
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">粘贴对话内容</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="用户A: 你好&#10;用户B: 你好呀"
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
        />
      </div>
      <div className="text-xs text-gray-500">
        支持格式: 用户A: 内容、[用户A] 内容、用户A - 内容
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleParse}
          className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
        >
          预览
        </button>
        <button
          onClick={handleImport}
          disabled={!text.trim()}
          className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 text-sm"
        >
          导入
        </button>
      </div>
      {newUsers.length > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm font-medium text-blue-700 mb-2">
            发现 {newUsers.length} 个新用户
          </div>
          <div className="flex flex-wrap gap-2">
            {newUsers.map(name => (
              <span key={name} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                {name}
              </span>
            ))}
          </div>
          <div className="text-xs text-blue-600 mt-2">
            点击导入后，这些用户将自动添加到用户管理中
          </div>
        </div>
      )}
      {preview.length > 0 && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm font-medium text-gray-700 mb-2">预览 ({preview.length} 条消息)</div>
          <div className="space-y-1 max-h-40 overflow-y-auto text-xs">
            {preview.map((item, i) => (
              <div key={i} className="text-gray-600">
                <span className="font-medium">{item.sender}:</span> {item.content}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
