import type { Message } from '@/types';
import type { TypingAnimationConfig, TypingEvent, MessageTypingSequence } from '../types';
import { splitIntoWords, getWordLength } from './ChineseWordSplitter';

const COMMON_TYPOS: Record<string, string[]> = {
  // 英文字母（键盘相邻键）
  'q': ['w', 'a'],
  'w': ['q', 'e', 's', 'a'],
  'e': ['w', 'r', 'd', 's'],
  'r': ['e', 't', 'f', 'd'],
  't': ['r', 'y', 'g', 'f'],
  'y': ['t', 'u', 'h', 'g'],
  'u': ['y', 'i', 'j', 'h'],
  'i': ['u', 'o', 'k', 'j'],
  'o': ['i', 'p', 'l', 'k'],
  'p': ['o', 'l'],
  'a': ['q', 'w', 's', 'z'],
  's': ['a', 'w', 'e', 'd', 'x', 'z'],
  'd': ['s', 'e', 'r', 'f', 'c', 'x'],
  'f': ['d', 'r', 't', 'g', 'v', 'c'],
  'g': ['f', 't', 'y', 'h', 'b', 'v'],
  'h': ['g', 'y', 'u', 'j', 'n', 'b'],
  'j': ['h', 'u', 'i', 'k', 'm', 'n'],
  'k': ['j', 'i', 'o', 'l', 'm'],
  'l': ['k', 'o', 'p'],
  'z': ['a', 's', 'x'],
  'x': ['z', 's', 'd', 'c'],
  'c': ['x', 'd', 'f', 'v'],
  'v': ['c', 'f', 'g', 'b'],
  'b': ['v', 'g', 'h', 'n'],
  'n': ['b', 'h', 'j', 'm'],
  'm': ['n', 'j', 'k'],
  // 常见中文错字（拼音相似或形近）
  '你': ['您', '他', '她', '我'],
  '我': ['你', '他', '她', '们'],
  '他': ['她', '它', '你', '我'],
  '她': ['他', '它', '你', '我'],
  '它': ['他', '她'],
  '好': ['很', '吗', '吧', '呢'],
  '是': ['的', '不', '有', '在'],
  '不': ['是', '在', '有', '没'],
  '在': ['不', '有', '是', '这'],
  '了': ['的', '着', '过', '呢'],
  '的': ['了', '地', '得', '呢'],
  '啊': ['呀', '吧', '呢', '哦'],
  '吧': ['啊', '呀', '呢', '吗'],
  '吗': ['吧', '呢', '啊', '呀'],
  '呢': ['吗', '吧', '啊', '呀'],
  '呀': ['啊', '吧', '呢', '哦'],
  '哦': ['啊', '呀', '呢', '噢'],
  '很': ['好', '真', '太', '挺'],
  '真': ['很', '太', '挺', '最'],
  '太': ['很', '真', '挺', '最'],
  '还': ['会', '能', '都', '又'],
  '会': ['还', '能', '都', '又'],
  '能': ['还', '会', '都', '可'],
  '都': ['还', '会', '能', '全'],
  '就': ['才', '都', '也', '却'],
  '才': ['就', '都', '也', '只'],
  '也': ['都', '就', '才', '还'],
  '有': ['没', '在', '是', '要'],
  '没': ['有', '不', '无', '别'],
  '要': ['会', '能', '想', '得'],
  '想': ['要', '会', '能', '得'],
  '去': ['来', '走', '到', '过'],
  '来': ['去', '走', '到', '过'],
  '走': ['去', '来', '跑', '到'],
  '到': ['去', '来', '走', '过'],
  '说': ['讲', '问', '叫', '谈'],
  '讲': ['说', '问', '叫', '谈'],
  '问': ['说', '讲', '叫', '答'],
  '看': ['见', '望', '瞧', '盯'],
  '见': ['看', '望', '瞧', '现'],
  '知': ['道', '识', '懂', '觉'],
  '道': ['知', '路', '到', '理'],
  '这': ['那', '此', '哪', '怎'],
  '那': ['这', '哪', '哪', '彼'],
  '怎': ['什', '为', '何', '么'],
  '么': ['吗', '呢', '么', '嘛'],
  '什': ['怎', '为', '哪', '何'],
  '为': ['因', '怎', '什', '何'],
  '因': ['为', '所', '由', '缘'],
  '可': ['能', '会', '要', '得'],
  '以': ['已', '一', '与', '予'],
  '已': ['以', '一', '也', '经'],
  '一': ['已', '以', '二', '不'],
  '二': ['一', '三', '两', '儿'],
  '三': ['二', '四', '山', '删'],
  '个': ['各', '们', '位', '过'],
  '们': ['个', '位', '的', '么'],
  '和': ['与', '跟', '同', '或'],
  '与': ['和', '跟', '同', '或'],
  '跟': ['和', '与', '同', '给'],
  '同': ['和', '与', '跟', '通'],
  '但': ['可', '却', '只', '因'],
  '却': ['但', '可', '只', '就'],
  '只': ['但', '却', '就', '这'],
  '又': ['还', '也', '再', '更'],
  '再': ['又', '还', '也', '在'],
  '更': ['最', '很', '太', '越'],
  '最': ['更', '很', '太', '真'],
  '对': ['错', '比', '向', '跟'],
  '错': ['对', '差', '误', '过'],
  '过': ['错', '去', '经', '度'],
  '经': ['过', '已', '曾', '常'],
  '常': ['经', '总', '老', '平'],
  '总': ['常', '都', '全', '老'],
  '老': ['常', '总', '旧', '少'],
  '少': ['多', '老', '小', '大'],
  '多': ['少', '大', '很', '太'],
  '大': ['小', '多', '太', '大'],
  '小': ['大', '少', '微', '细'],
  '上': ['下', '尚', '让', '与'],
  '下': ['上', '吓', '不', '无'],
  '里': ['外', '面', '内', '中'],
  '外': ['里', '面', '出', '另'],
  '面': ['里', '外', '方', '边'],
  '边': ['面', '方', '旁', '侧'],
  '前': ['后', '先', '早', '原'],
  '后': ['前', '最', '然', '候'],
  '左': ['右', '佐', '在', '做'],
  '右': ['左', '又', '有', '佑'],
  '天': ['日', '时', '周', '夫'],
  '日': ['天', '月', '曰', '白'],
  '月': ['日', '周', '年', '明'],
  '年': ['月', '日', '季', '纪'],
  '时': ['天', '候', '期', '间'],
  '候': ['时', '后', '等', '客'],
  '等': ['候', '待', '级', '差'],
  '人': ['入', '大', '个', '仁'],
  '入': ['人', '八', '人', '内'],
  '出': ['入', '山', '击', '去'],
  '心': ['必', '思', '意', '忘'],
  '手': ['毛', '看', '拿', '打'],
  '眼': ['目', '睛', '看', '眉'],
  '头': ['大', '首', '项', '点'],
  '点': ['头', '地', '些', '占'],
  '地': ['的', '得', '点', '土'],
  '得': ['的', '地', '德', '到'],
  '开': ['关', '启', '并', '门'],
  '关': ['开', '闭', '门', '过'],
  '门': ['开', '关', '问', '闪'],
  '车': ['东', '连', '轨', '轮'],
  '路': ['道', '街', '途', '径'],
  '家': ['官', '室', '庭', '居'],
  '国': ['围', '图', '圆', '内'],
  '学': ['觉', '字', '校', '习'],
  '生': ['主', '声', '性', '星'],
  '工': ['土', '干', '左', '作'],
  '作': ['做', '坐', '工', '昨'],
  '做': ['作', '坐', '故'],
  '坐': ['作', '做', '座', '昨'],
  '吃': ['喝', '去', '口', '乞'],
  '喝': ['吃', '渴', '口', '呵'],
  '玩': ['现', '顽', '整', '完'],
  '听': ['说', '讲', '声', '经'],
  '写': ['字', '与', '作', '止'],
  '字': ['学', '子', '写', '文'],
  '书': ['写', '文', '籍', '画'],
  '画': ['书', '图', '界'],
  '爱': ['受', '友', '情', '要'],
  '情': ['爱', '心', '感', '请'],
  '友': ['爱', '朋', '发', '又'],
  '朋': ['友', '明', '用', '月'],
};

function getTypo(char: string): string | null {
  const typos = COMMON_TYPOS[char];
  if (typos) {
    // 移除内部的70%概率检查，让配置的 typoProbability 直接生效
    return typos[Math.floor(Math.random() * typos.length)];
  }
  return null;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * 添加单个字符的打字事件，包含错字处理逻辑
 * @returns 新的 timestamp
 */
function addCharWithTypo(
  events: TypingEvent[],
  char: string,
  timestamp: number,
  config: TypingAnimationConfig
): number {
  // 错字处理
  if (config.typoEnabled && Math.random() < config.typoProbability) {
    const typo = getTypo(char);
    if (typo) {
      // 输出错误字符
      const typoDuration = randomBetween(config.baseSpeed, config.baseSpeed + config.speedVariance);
      events.push({
        type: 'char',
        content: typo,
        duration: typoDuration,
        timestamp,
        effect: 'normal',
      });
      timestamp += typoDuration + 300;

      // 退格删除
      events.push({
        type: 'backspace',
        duration: config.typoDeleteStyle === 'instant' ? 0 : 100,
        timestamp,
      });
      timestamp += config.typoDeleteStyle === 'instant' ? 0 : 100;
    }
  }

  // 输出正确字符
  const charDuration = randomBetween(
    config.baseSpeed - config.speedVariance / 2,
    config.baseSpeed + config.speedVariance / 2
  );
  events.push({
    type: 'char',
    content: char,
    duration: charDuration,
    timestamp,
    effect: 'normal',
  });
  timestamp += charDuration;

  return timestamp;
}

function parseContent(content: string): Array<{ type: 'text' | 'emoji'; value: string }> {
  const parts: Array<{ type: 'text' | 'emoji'; value: string }> = [];
  let lastIndex = 0;
  let match;

  const emojiRegex = /\[[^\]]{1,10}\]/g;
  while ((match = emojiRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: content.substring(lastIndex, match.index) });
    }
    parts.push({ type: 'emoji', value: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', value: content.substring(lastIndex) });
  }

  return parts;
}

export function generateTypingSequence(
  message: Message,
  config: TypingAnimationConfig
): MessageTypingSequence {
  const events: TypingEvent[] = [];
  let timestamp = 0;

  if (message.type === 'system') {
    return {
      messageId: message.id,
      events: [],
      totalDuration: 0,
      visibleText: message.content || '',
    };
  }

  const content = message.content || '';
  const parts = parseContent(content);

  for (const part of parts) {
    if (part.type === 'emoji') {
      const duration = randomBetween(config.baseSpeed, config.baseSpeed + config.speedVariance);
      events.push({
        type: 'emoji',
        content: part.value,
        duration,
        timestamp,
        effect: config.emojiEnabled ? (config.emojiEffect === 'none' ? 'normal' : config.emojiEffect) : 'normal',
      });
      timestamp += duration;
    } else {
      const words = splitIntoWords(part.value);

      for (const word of words) {
        if (config.pauseEnabled && Math.random() < config.pauseProbability) {
          const pauseDuration = randomBetween(config.pauseMinDuration, config.pauseMaxDuration);
          events.push({
            type: 'pause',
            duration: pauseDuration,
            timestamp,
          });
          timestamp += pauseDuration;
        }

        const wordLen = getWordLength(word);
        const roll = Math.random();
        const total = config.charChance + config.wordChance;
        const charChance = config.charChance / total;
        const wordChance = (config.charChance + config.wordChance) / total;

        if (roll < charChance) {
          for (const char of word) {
            timestamp = addCharWithTypo(events, char, timestamp, config);
          }
        } else if (roll < wordChance) {
          const isPaste = wordLen >= config.pasteMinLength &&
                          wordLen <= config.pasteMaxLength &&
                          Math.random() < config.pasteChance;

          if (isPaste) {
            events.push({
              type: 'paste-flash',
              content: word,
              duration: 150,
              timestamp,
              effect: config.pasteAnimation,
            });
          } else {
            for (const char of word) {
              timestamp = addCharWithTypo(events, char, timestamp, config);
            }
          }
        } else {
          const isPaste = wordLen >= config.pasteMinLength &&
                          wordLen <= config.pasteMaxLength &&
                          Math.random() < config.pasteChance;

          if (isPaste) {
            events.push({
              type: 'paste-flash',
              content: word,
              duration: 150,
              timestamp,
              effect: config.pasteAnimation,
            });
          } else {
            for (const char of word) {
              timestamp = addCharWithTypo(events, char, timestamp, config);
            }
          }
        }
      }
    }
  }

  return {
    messageId: message.id,
    events,
    totalDuration: timestamp,
    visibleText: content,
  };
}

export function generateAllSequences(
  messages: Message[],
  config: TypingAnimationConfig
): Map<string, MessageTypingSequence> {
  const sequences = new Map<string, MessageTypingSequence>();

  for (const msg of messages) {
    if (msg.type !== 'system') {
      sequences.set(msg.id, generateTypingSequence(msg, config));
    }
  }

  return sequences;
}

export function getVisibleContentAtTime(
  sequence: MessageTypingSequence,
  elapsedTime: number
): { text: string; currentIndex: number; isTyping: boolean } {
  let text = '';
  let currentIndex = 0;
  let backspaceCount = 0;
  let lastTypingTimestamp = 0;

  for (const event of sequence.events) {
    if (event.timestamp > elapsedTime) break;

    switch (event.type) {
      case 'char':
        text += event.content;
        currentIndex++;
        lastTypingTimestamp = event.timestamp;
        break;
      case 'emoji':
        text += event.content;
        currentIndex++;
        lastTypingTimestamp = event.timestamp;
        break;
      case 'backspace':
        if (text.length > 0) {
          const emojiMatch = text.match(/\[[^\]]+\]$/);
          if (emojiMatch && text.endsWith(emojiMatch[0])) {
            text = text.slice(0, -emojiMatch[0].length);
          } else {
            text = text.slice(0, -1);
          }
        }
        backspaceCount++;
        lastTypingTimestamp = event.timestamp;
        break;
      case 'pause':
        break;
      case 'paste-flash':
        text += event.content || '';
        currentIndex += (event.content || '').length;
        lastTypingTimestamp = event.timestamp;
        break;
    }
  }

  const isTyping = elapsedTime < sequence.totalDuration && 
                   elapsedTime - lastTypingTimestamp < 500;

  return {
    text,
    currentIndex,
    isTyping,
  };
}

export function estimateDuration(
  messages: Message[],
  config: TypingAnimationConfig
): number {
  if (!config.enabled || config.fastMode) {
    return messages.length;
  }

  let totalMs = 0;

  for (const msg of messages) {
    if (msg.type === 'system') {
      totalMs += 1000;
      continue;
    }

    if (msg.type === 'image' || msg.type === 'voice' || msg.type === 'redpacket' || msg.type === 'transfer' || msg.type === 'file') {
      totalMs += 1500;
      continue;
    }

    const content = msg.content || '';
    const charCount = content.length;

    if (charCount === 0) {
      totalMs += 500;
      continue;
    }

    const avgSpeed = config.baseSpeed;
    const variance = config.speedVariance * charCount * 0.3;
    const typoTime = config.typoEnabled ? charCount * config.typoProbability * 400 : 0;
    const pauseTime = config.pauseEnabled ? config.pauseProbability * (config.pauseMinDuration + config.pauseMaxDuration) / 2 : 0;

    totalMs += charCount * avgSpeed + variance + typoTime + pauseTime + 500;
  }

  return Math.round(totalMs / 1000);
}

export function calculateSpeedMultiplier(
  estimatedDuration: number,
  targetDuration: number
): number {
  if (estimatedDuration <= 0) return 1.0;
  
  const multiplier = estimatedDuration / targetDuration;
  
  return Math.max(0.1, Math.min(4.0, multiplier));
}

export interface DurationRange {
  min: number;
  max: number;
  recommended: number;
}

export function calculateDurationRange(
  messages: Message[]
): DurationRange {
  if (messages.length === 0) {
    return { min: 2, max: 10, recommended: 5 };
  }

  const msgCount = messages.length;
  const standardDuration = msgCount * 0.5;
  
  const minDuration = Math.round(standardDuration / 4);
  const maxDuration = Math.round(standardDuration / 0.1);
  
  const min = Math.max(2, minDuration);
  const max = Math.max(min + 2, Math.min(120, maxDuration));
  const recommended = Math.round((min + max) / 2);
  
  return {
    min,
    max,
    recommended: Math.max(min, Math.min(max, recommended))
  };
}
