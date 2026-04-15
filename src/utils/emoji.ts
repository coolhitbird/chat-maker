export type WechatEmoji = {
  key: string;
  name: string;
  unicode?: string;
  url?: string;
};

export const wechatEmojis: WechatEmoji[] = [
  { key: '[微笑]', name: 'smile', unicode: '😊' },
  { key: '[撇嘴]', name: 'pout', unicode: '😒' },
  { key: '[色]', name: 'colored', unicode: '😍' },
  { key: '[发呆]', name: 'daze', unicode: '😳' },
  { key: '[得意]', name: 'proud', unicode: '😏' },
  { key: '[流泪]', name: 'cry', unicode: '😭' },
  { key: '[害羞]', name: 'shy', unicode: '😊' },
  { key: '[闭嘴]', name: 'shut_up', unicode: '🤐' },
  { key: '[睡]', name: 'sleep', unicode: '😴' },
  { key: '[大哭]', name: 'sob', unicode: '😭' },
  { key: '[尴尬]', name: 'awkward', unicode: '😰' },
  { key: '[发怒]', name: 'angry', unicode: '😠' },
  { key: '[调皮]', name: 'evil', unicode: '😜' },
  { key: '[呲牙]', name: 'grin', unicode: '😬' },
  { key: '[惊讶]', name: 'surprised', unicode: '😲' },
  { key: '[难过]', name: 'sad', unicode: '😢' },
  { key: '[酷]', name: 'cool', unicode: '😎' },
  { key: '[冷汗]', name: 'cold_sweat', unicode: '😰' },
  { key: '[抓狂]', name: 'scream', unicode: '🤯' },
  { key: '[吐]', name: 'vomit', unicode: '🤮' },
  { key: '[偷笑]', name: 'laugh', unicode: '🤭' },
  { key: '[愉快]', name: 'happy', unicode: '😊' },
  { key: '[白眼]', name: 'ignore', unicode: '🙄' },
  { key: '[傲慢]', name: 'smug', unicode: '😏' },
  { key: '[饥饿]', name: 'hungry', unicode: '🍽️' },
  { key: '[困]', name: 'drowsy', unicode: '😪' },
  { key: '[惊恐]', name: 'panic', unicode: '😱' },
  { key: '[流汗]', name: 'sweat', unicode: '😅' },
  { key: '[憨笑]', name: 'simple_smile', unicode: '😄' },
  { key: '[大兵]', name: 'soldier', unicode: '💂' },
  { key: '[奋斗]', name: 'fight', unicode: '💪' },
  { key: '[咒骂]', name: 'curse', unicode: '🤬' },
  { key: '[疑问]', name: 'doubt', unicode: '🤔' },
  { key: '[嘘]', name: 'shhh', unicode: '🤫' },
  { key: '[晕]', name: 'dizzy', unicode: '😵' },
  { key: '[疯了]', name: 'crazy', unicode: '🌀' },
  { key: '[衰]', name: 'toast', unicode: '😓' },
  { key: '[骷髅]', name: 'skull', unicode: '💀' },
  { key: '[敲打]', name: 'knock', unicode: '🔨' },
  { key: '[再见]', name: 'bye', unicode: '👋' },
  { key: '[擦汗]', name: 'wipe_sweat', unicode: '💦' },
  { key: '[抠鼻]', name: 'pick_nose', unicode: '🤦' },
  { key: '[鼓掌]', name: 'clap', unicode: '👏' },
  { key: '[糗大了]', name: 'embarrassed', unicode: '😅' },
  { key: '[坏笑]', name: 'evil_grin', unicode: '😈' },
  { key: '[左哼哼]', name: 'left_hmph', unicode: '😤' },
  { key: '[右哼哼]', name: 'right_hmph', unicode: '😤' },
  { key: '[哈欠]', name: 'yawn', unicode: '😪' },
  { key: '[鄙视]', name: 'despise', unicode: '😒' },
  { key: '[委屈]', name: 'wronged', unicode: '😢' },
  { key: '[快哭了]', name: 'about_to_cry', unicode: '😢' },
  { key: '[阴险]', name: 'sinister', unicode: '😈' },
  { key: '[亲亲]', name: 'kiss', unicode: '😘' },
  { key: '[吓]', name: 'scared', unicode: '😱' },
  { key: '[可怜]', name: 'pity', unicode: '🥺' },
  { key: '[菜刀]', name: 'knife', unicode: '🔪' },
  { key: '[旺柴]', name: 'dog', unicode: '🐕' },
  { key: '[爱心]', name: 'heart', unicode: '❤️' },
  { key: '[双鱼座]', name: 'pisces', unicode: '♓' },
  { key: '[月饼]', name: 'mooncake', unicode: '🥮' },
  { key: '[啤酒]', name: 'beer', unicode: '🍺' },
  { key: '[篮球]', name: 'basketball', unicode: '🏀' },
  { key: '[乒乓]', name: 'pingpong', unicode: '🏓' },
  { key: '[咖啡]', name: 'coffee', unicode: '☕' },
  { key: '[米饭]', name: 'rice', unicode: '🍚' },
  { key: '[猪头]', name: 'pig', unicode: '🐷' },
  { key: '[玫瑰]', name: 'rose', unicode: '🌹' },
  { key: '[凋谢]', name: 'wilted', unicode: '🥀' },
  { key: '[嘴唇]', name: 'lips', unicode: '💋' },
  { key: '[大拇指]', name: 'thumbsup', unicode: '👍' },
  { key: '[示爱]', name: 'falling_heart', unicode: '💘' },
  { key: '[瓢虫]', name: 'ladybug', unicode: '🐞' },
  { key: '[抱拳]', name: 'folded_hands', unicode: '🤝' },
  { key: '[勾引]', name: 'invite', unicode: '😏' },
  { key: '[拳头]', name: 'fist', unicode: '✊' },
  { key: '[OK]', name: 'ok', unicode: '👌' },
  { key: '[耶]', name: 'yeah', unicode: '🙌' },
  { key: '[握手]', name: 'handshake', unicode: '🤝' },
  { key: '[破窗]', name: 'broken_window', unicode: '💔' },
  { key: '[发抖]', name: 'shiver', unicode: '🥶' },
  { key: '[红中]', name: 'mahjong', unicode: '🀄' },
  { key: '[柠檬]', name: 'lemon', unicode: '🍋' },
  { key: '[绿帽子]', name: 'green_hat', unicode: '💚' },
  { key: '[小心]', name: 'warning', unicode: '⚠️' },
  { key: '[枫叶]', name: 'maple', unicode: '🍁' },
  { key: '[小破窗]', name: 'small_broken', unicode: '💔' },
];

const emojiMap = new Map(wechatEmojis.map(e => [e.key, e]));

export function parseEmoji(content: string): (string | { type: 'emoji'; emoji: WechatEmoji })[] {
  const parts: (string | { type: 'emoji'; emoji: WechatEmoji })[] = [];
  let remaining = content;
  let lastIndex = 0;

  const emojiPattern = /\[([^\]]+)\]/g;
  let match;

  while ((match = emojiPattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(remaining.slice(0, match.index - lastIndex));
      remaining = remaining.slice(match.index - lastIndex);
      lastIndex = match.index;
    }

    const emoji = emojiMap.get(match[0]);
    if (emoji) {
      parts.push({ type: 'emoji', emoji });
      remaining = remaining.slice(match[0].length);
      lastIndex += match[0].length;
    } else {
      parts.push(match[0]);
      remaining = remaining.slice(match[0].length);
      lastIndex += match[0].length;
    }
  }

  if (remaining) {
    parts.push(remaining);
  }

  return parts;
}

export function getEmojiUrl(name: string): string | undefined {
  const emoji = wechatEmojis.find(e => e.name === name);
  return emoji?.url;
}

export function getEmojiUnicode(key: string): string | undefined {
  const emoji = wechatEmojis.find(e => e.key === key);
  return emoji?.unicode;
}

export function searchEmojis(query: string): WechatEmoji[] {
  const q = query.toLowerCase();
  return wechatEmojis.filter(e => 
    e.name.toLowerCase().includes(q) || 
    e.key.includes(query)
  );
}
