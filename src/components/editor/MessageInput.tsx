import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import EmojiPicker from '@/components/common/EmojiPicker';
import RedPacketEditor from './RedPacketEditor';
import TransferEditor from './TransferEditor';
import ImageEditor from './ImageEditor';
import VoiceEditor from './VoiceEditor';
import SystemEditor from './SystemEditor';
import FileEditor from './FileEditor';
import type { Message, QuoteData } from '@/types';

interface MessageInputProps {
  quoteMessage?: Message | null;
  onClearQuote?: () => void;
}

export default function MessageInput({ quoteMessage, onClearQuote }: MessageInputProps) {
  const { project, addMessage } = useChatStore();
  const [sender, setSender] = useState(project.users[0]?.name || '');
  const [content, setContent] = useState('');

  // 项目切换时同步 sender 到第一个用户
  useEffect(() => {
    if (project.users[0]) setSender(project.users[0].name);
  }, [project.id]);

  const [showEmoji, setShowEmoji] = useState(false);
  const [showRedPacket, setShowRedPacket] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [showSystem, setShowSystem] = useState(false);
  const [showFile, setShowFile] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !sender) return;

    const user = project.users.find(u => u.name === sender);
    if (!user) return;

    // 构建引用数据
    let quoteData: QuoteData | undefined;
    if (quoteMessage) {
      quoteData = {
        messageId: quoteMessage.id,
        sender: quoteMessage.sender,
        content: quoteMessage.content,
        type: quoteMessage.type,
        file: quoteMessage.file,
        image: quoteMessage.image,
        voice: quoteMessage.voice,
        transfer: quoteMessage.transfer,
        redPacket: quoteMessage.redPacket,
        timestampData: quoteMessage.timestampData,
        system: quoteMessage.system,
      };
    }

    addMessage({
      role: user.role,
      sender: user.name,
      avatar: user.avatar,
      content: content.trim(),
      type: 'text',
      timestamp: Date.now(),
      quote: quoteData,
    });

    setContent('');
    onClearQuote?.();
  };

  const handleEmojiSelect = (emoji: string) => {
    setContent(prev => prev + emoji);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">发送者</label>
        <select
          value={sender}
          onChange={e => setSender(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          {project.users.map(user => (
            <option key={user.id} value={user.name}>{user.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">消息内容</label>
        {quoteMessage && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg border-l-4 border-blue-400">
            <div className="flex-1 min-w-0">
              <span className="text-xs text-gray-500 dark:text-gray-400">引用 {quoteMessage.sender}：</span>
              <span className="text-xs text-gray-700 dark:text-gray-300 truncate block">
                {quoteMessage.content.length > 40 ? quoteMessage.content.slice(0, 40) + '…' : quoteMessage.content}
              </span>
            </div>
            <button
              type="button"
              onClick={onClearQuote}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="relative" ref={pickerRef}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="输入消息内容，支持微信表情如 [微笑]..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <button
            type="button"
            onClick={() => setShowEmoji(!showEmoji)}
            className="absolute right-2 bottom-2 p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            title="插入表情"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          {showEmoji && (
            <EmojiPicker onSelect={handleEmojiSelect} />
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          提示：输入 [微笑] 等表情代码，或点击表情按钮选择
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!content.trim()}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          添加消息
        </button>
        <button
          type="button"
          onClick={() => setShowRedPacket(true)}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          红包
        </button>
        <button
          type="button"
          onClick={() => setShowTransfer(true)}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          转账
        </button>
        <button
          type="button"
          onClick={() => setShowImage(true)}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          图片
        </button>
        <button
          type="button"
          onClick={() => setShowVoice(true)}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          语音
        </button>
        <button
          type="button"
          onClick={() => setShowSystem(true)}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          系统
        </button>
        <button
          type="button"
          onClick={() => setShowFile(true)}
          className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
        >
          文件
        </button>
      </div>
      
      <RedPacketEditor 
        isOpen={showRedPacket} 
        onClose={() => setShowRedPacket(false)} 
      />
      
      <TransferEditor 
        isOpen={showTransfer} 
        onClose={() => setShowTransfer(false)} 
      />
      
      <ImageEditor 
        isOpen={showImage} 
        onClose={() => setShowImage(false)} 
      />
      
      <VoiceEditor 
        isOpen={showVoice} 
        onClose={() => setShowVoice(false)} 
      />
      
      <SystemEditor 
        isOpen={showSystem} 
        onClose={() => setShowSystem(false)} 
      />
      
      <FileEditor
        isOpen={showFile}
        onClose={() => setShowFile(false)}
      />
    </form>
  );
}
