import { useState } from 'react';
import { wechatEmojis, searchEmojis } from '@/utils/emoji';
import type { WechatEmoji } from '@/types';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export default function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'common' | 'all'>('common');

  const commonEmojis = [
    '[微笑]', '[撇嘴]', '[色]', '[发呆]', '[得意]', '[流泪]', '[害羞]', '[闭嘴]',
    '[睡]', '[大哭]', '[尴尬]', '[发怒]', '[调皮]', '[呲牙]', '[惊讶]', '[难过]',
    '[酷]', '[冷汗]', '[抓狂]', '[吐]', '[偷笑]', '[愉快]', '[白眼]', '[傲慢]',
    '[饥饿]', '[困]', '[惊恐]', '[流汗]', '[憨笑]', '[大兵]', '[奋斗]', '[咒骂]',
    '[疑问]', '[嘘]', '[晕]', '[疯了]', '[衰]', '[骷髅]', '[敲打]', '[再见]',
  ];

  const displayEmojis = search
    ? searchEmojis(search)
    : activeTab === 'common'
      ? commonEmojis.map(key => wechatEmojis.find(e => e.key === key)).filter((e): e is WechatEmoji => e !== undefined)
      : wechatEmojis;

  return (
    <div className="absolute z-50 bottom-full left-0 mb-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
      <div className="p-2 border-b border-gray-100">
        <input
          type="text"
          placeholder="搜索表情..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {!search && (
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('common')}
            className={`flex-1 py-2 text-sm font-medium ${
              activeTab === 'common' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'
            }`}
          >
            常用
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-2 text-sm font-medium ${
              activeTab === 'all' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'
            }`}
          >
            全部
          </button>
        </div>
      )}

      <div className="p-2 max-h-64 overflow-y-auto">
        <div className="grid grid-cols-8 gap-1">
          {displayEmojis.map(emoji => (
            <button
              key={emoji.key}
              onClick={() => {
                onSelect(emoji.key);
              }}
              className="p-1 hover:bg-gray-100 rounded transition-colors text-center"
              title={emoji.name}
            >
              <img
                src={emoji.url}
                alt={emoji.key}
                className="w-6 h-6 mx-auto object-contain"
                onError={e => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
              <span className="hidden text-xs">{emoji.key}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
