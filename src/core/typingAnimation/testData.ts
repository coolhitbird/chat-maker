import type { Message } from '@/types';
import { nanoid } from 'nanoid';

const now = Date.now();

export interface TestUser {
  id: string;
  name: string;
  avatar: string;
  role: 'user' | 'assistant';
}

export const TEST_USERS: TestUser[] = [
  {
    id: 'user-a',
    name: '用户A',
    avatar: 'data:image/svg+xml;base64,AAAA',
    role: 'user',
  },
  {
    id: 'user-b',
    name: '用户B',
    avatar: 'data:image/svg+xml;base64,BBBB',
    role: 'assistant',
  },
];

function createTextMessage(
  id: string,
  role: 'user' | 'assistant',
  sender: string,
  content: string,
  offset: number = 0
): Message {
  return {
    id,
    role,
    sender,
    avatar: sender === '用户A' ? TEST_USERS[0].avatar : TEST_USERS[1].avatar,
    content,
    type: 'text',
    timestamp: now + offset,
  };
}

function createVoiceMessage(
  id: string,
  role: 'user' | 'assistant',
  sender: string,
  duration: number,
  voiceText: string | undefined,
  offset: number = 0
): Message {
  return {
    id,
    role,
    sender,
    avatar: sender === '用户A' ? TEST_USERS[0].avatar : TEST_USERS[1].avatar,
    content: '',
    type: 'voice',
    timestamp: now + offset,
    voice: {
      duration,
      text: voiceText,
    },
  };
}

export const TEST_MESSAGES_SHORT: Message[] = [
  createTextMessage('test-1', 'user', '用户A', '你好', 1000),
  createTextMessage('test-2', 'assistant', '用户B', '嗨', 2000),
  createTextMessage('test-3', 'user', '用户A', '在吗？', 3000),
  createTextMessage('test-4', 'assistant', '用户B', '在的', 4000),
];

export const TEST_MESSAGES_TYPING_ANIMATION: Message[] = [
  createTextMessage('typing-1', 'user', '用户A', '你好', 1000),
  createTextMessage('typing-2', 'assistant', '用户B', '你好呀！很高兴认识你！', 2000),
  createTextMessage('typing-3', 'user', '用户A', '我也是', 3000),
  createTextMessage('typing-4', 'assistant', '用户B', '今天天气真不错，我们去逛街吧！', 4000),
];

export const TEST_MESSAGES_VOICE: Message[] = [
  createVoiceMessage('voice-1', 'user', '用户A', 3, '好的', 1000),
  createVoiceMessage('voice-2', 'assistant', '用户B', 8, '没问题，我现在就帮你处理这个问题。这个功能需要先检查一下代码逻辑。', 3000),
  createVoiceMessage('voice-3', 'user', '用户A', 5, undefined, 6000),
];

export const TEST_MESSAGES_MIXED: Message[] = [
  createTextMessage('mixed-1', 'user', '用户A', '在吗？', 1000),
  createVoiceMessage('mixed-2', 'assistant', '用户B', 3, '好的', 2000),
  createTextMessage('mixed-3', 'user', '用户A', '今天天气真好[微笑][太阳]', 3000),
  createVoiceMessage('mixed-4', 'assistant', '用户B', 15, '没问题，我现在就帮你处理这个问题。这个功能需要先检查一下代码逻辑，然后才能进行下一步的修改。', 4000),
  createTextMessage('mixed-5', 'user', '用户A', '收到，谢谢！', 6000),
  createVoiceMessage('mixed-6', 'user', '用户A', 8, undefined, 7000),
];

export const TEST_MESSAGES_ALL_TYPES: Message[] = [
  createTextMessage('all-1', 'user', '用户A', '你好', 1000),
  createTextMessage('all-2', 'assistant', '用户B', '这是一段比较长的文字，用于测试文字换行功能是否正常工作。包含中文和English混合。', 2000),
  createVoiceMessage('all-3', 'user', '用户A', 3, '好的', 3000),
  createVoiceMessage('all-4', 'assistant', '用户B', 15, '没问题，我现在就帮你处理这个问题。这个功能需要先检查一下代码逻辑，然后才能进行下一步的修改。', 4000),
  createVoiceMessage('all-5', 'user', '用户A', 8, undefined, 5000),
  {
    id: 'all-6',
    role: 'assistant',
    sender: '用户B',
    avatar: TEST_USERS[1].avatar,
    content: '恭喜发财',
    type: 'redpacket',
    timestamp: now + 6000,
    redPacket: {
      amount: 1000,
      greeting: '恭喜发财，大吉大利',
      sender: '用户B',
      isOpened: false,
    },
  },
  {
    id: 'all-7',
    role: 'user',
    sender: '用户A',
    avatar: TEST_USERS[0].avatar,
    content: '谢谢红包',
    type: 'redpacket',
    timestamp: now + 7000,
    redPacket: {
      amount: 100,
      greeting: '恭喜发财',
      sender: '用户A',
      receiver: '用户B',
      isOpened: true,
    },
  },
  {
    id: 'all-8',
    role: 'assistant',
    sender: '用户B',
    avatar: TEST_USERS[1].avatar,
    content: '转账给你了',
    type: 'transfer',
    timestamp: now + 8000,
    transfer: {
      amount: 5000,
      note: '这是转账备注',
      sender: '用户B',
      isReceived: true,
    },
  },
  {
    id: 'all-9',
    role: 'user',
    sender: '用户A',
    avatar: TEST_USERS[0].avatar,
    content: '看看这张图',
    type: 'image',
    timestamp: now + 9000,
    image: {
      url: 'https://via.placeholder.com/300x200.png',
      width: 300,
      height: 200,
      caption: '这是一张图片',
    },
  },
  {
    id: 'all-10',
    role: 'assistant',
    sender: '用户B',
    avatar: TEST_USERS[1].avatar,
    content: '发你一个文件',
    type: 'file',
    timestamp: now + 10000,
    file: {
      name: '项目文档.pdf',
      size: '2.5 MB',
      type: 'PDF',
    },
  },
  {
    id: 'all-11',
    role: 'assistant',
    sender: '系统',
    avatar: '',
    content: '你撤回了一条消息',
    type: 'system',
    timestamp: now + 11000,
    system: {
      text: '你撤回了一条消息',
      type: 'recall',
    },
  },
  createTextMessage('all-12', 'user', '用户A', '今天天气真好[微笑][太阳]', 12000),
  createTextMessage('all-13', 'assistant', '用户B', 'This is a very long English message that needs to wrap to multiple lines. It contains multiple sentences and should test word wrapping correctly.', 13000),
  {
    id: 'all-14',
    role: 'assistant',
    sender: '系统',
    avatar: '',
    content: '今天 10:30',
    type: 'timestamp',
    timestamp: now + 14000,
    timestampData: {
      text: '今天 10:30',
    },
  },
  {
    id: 'all-15',
    role: 'assistant',
    sender: '系统',
    avatar: '',
    content: '小明 邀请 小红 加入了群聊',
    type: 'system',
    timestamp: now + 15000,
    system: {
      text: '小明 邀请 小红 加入了群聊',
      type: 'invite',
    },
  },
];

export function getTestMessages(type: 'short' | 'typing' | 'voice' | 'mixed' | 'all'): Message[] {
  switch (type) {
    case 'short':
      return TEST_MESSAGES_SHORT;
    case 'typing':
      return TEST_MESSAGES_TYPING_ANIMATION;
    case 'voice':
      return TEST_MESSAGES_VOICE;
    case 'mixed':
      return TEST_MESSAGES_MIXED;
    case 'all':
      return TEST_MESSAGES_ALL_TYPES;
    default:
      return TEST_MESSAGES_SHORT;
  }
}

export { nanoid };
