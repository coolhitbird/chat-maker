import type { Message } from '@/types';
import type { TypingAnimationConfig, TypingEvent, MessageTypingSequence } from '../types';
import { splitIntoWords, getWordLength } from './ChineseWordSplitter';

const COMMON_TYPOS: Record<string, string[]> = {
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
  '你': ['我', '他', '她', '您'],
  '我': ['你', '他', '她', '们'],
  '他': ['你', '我', '她'],
  '她': ['你', '我', '他'],
  '好': ['很', '的', '吗', '吧'],
  '是': ['的', '不', '有', '在'],
  '不': ['是', '在', '有', '没'],
  '在': ['不', '有', '是', '这'],
  '了': ['的', '着', '过', '吧'],
  '的': ['了', '地', '得'],
  '啊': ['呀', '吧', '呢', '哦'],
  '吧': ['啊', '呀', '呢', '吗'],
  '吗': ['吧', '呢', '啊', '呀'],
};

function getTypo(char: string): string | null {
  const typos = COMMON_TYPOS[char];
  if (typos && Math.random() < 0.7) {
    return typos[Math.floor(Math.random() * typos.length)];
  }
  return null;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
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
            if (config.typoEnabled && Math.random() < config.typoProbability) {
              const typo = getTypo(char);
              if (typo) {
                const typoDuration = randomBetween(config.baseSpeed, config.baseSpeed + config.speedVariance);
                events.push({
                  type: 'char',
                  content: typo,
                  duration: typoDuration,
                  timestamp,
                  effect: 'normal',
                });
                timestamp += typoDuration + 300;

                events.push({
                  type: 'backspace',
                  duration: config.typoDeleteStyle === 'instant' ? 0 : 100,
                  timestamp,
                });
                timestamp += config.typoDeleteStyle === 'instant' ? 0 : 100;
              }
            }

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
