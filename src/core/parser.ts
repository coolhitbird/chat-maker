import type { Message, UserProfile } from '@/types';
import { generateAvatar } from '@/utils/avatar';

interface ParsedLine {
  sender: string;
  content: string;
  isContinuation: boolean;
}

interface ParseResult {
  messages: Message[];
  newUsers: string[];
}

const senderPatterns: Array<{ regex: RegExp; extract: (match: RegExpMatchArray) => { sender: string; content: string } }> = [
  // [张三] 你好
  {
    regex: /^\[(.+?)\]\s*(.+)$/,
    extract: (m) => ({ sender: m[1].trim(), content: m[2].trim() })
  },
  // 名字: 你好
  {
    regex: /^([^\:\[\-\>\d][^\:\[\-\>]*?)[:：]\s*(.+)$/,
    extract: (m) => ({ sender: m[1].trim(), content: m[2].trim() })
  },
  // 名字 -> 你好
  {
    regex: /^(.+?)\s*[\-\>]\s*(.+)$/,
    extract: (m) => ({ sender: m[1].trim(), content: m[2].trim() })
  },
  // Human: / AI:
  {
    regex: /^(Human|AI)\s*[:：]\s*(.+)$/i,
    extract: (m) => ({
      sender: m[1].toLowerCase() === 'human' ? '用户A' : '用户B',
      content: m[2].trim()
    })
  },
];

function parseLine(line: string): ParsedLine | null {
  const trimmedLine = line.trim();
  if (!trimmedLine) return null;

  // 跳过纯数字/列表项开头的行（如 "1. xxx", "4. xxx"）
  if (/^\d+[\.、\s]/.test(trimmedLine)) {
    return { sender: '', content: trimmedLine, isContinuation: true };
  }

  // 检查是否是发送者行
  for (const { regex, extract } of senderPatterns) {
    const match = trimmedLine.match(regex);
    if (match) {
      return { 
        sender: extract(match).sender, 
        content: extract(match).content, 
        isContinuation: false 
      };
    }
  }

  // 不是发送者行，可能是延续内容
  return { sender: '', content: trimmedLine, isContinuation: true };
}

function mergeMultiLineContent(lines: string[]): string[] {
  const result: string[] = [];
  let currentBlock: string[] = [];
  let currentSender = '';
  let lastSender = '';

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const parsed = parseLine(trimmedLine);

    if (!parsed) continue;

    if (!parsed.isContinuation) {
      // 保存之前的块
      if (currentBlock.length > 0 && currentSender) {
        result.push(`${currentSender}: ${currentBlock.join(' ')}`);
      }
      // 开始新块
      currentSender = parsed.sender;
      currentBlock = [parsed.content];
      lastSender = currentSender;
    } else {
      // 延续行：可能是多行消息的延续
      if (currentBlock.length > 0) {
        // 检查是否真的是延续（不是新消息的开始）
        // 如果当前行看起来像独立消息（有冒号等），则作为新消息处理
        if (trimmedLine.includes(':') && /^[^\s]/.test(trimmedLine)) {
          // 保存之前的块
          if (currentSender) {
            result.push(`${currentSender}: ${currentBlock.join(' ')}`);
          }
          // 尝试解析这一行作为新消息
          const newParsed = parseLine(trimmedLine);
          if (newParsed && !newParsed.isContinuation) {
            currentSender = newParsed.sender;
            currentBlock = [newParsed.content];
          } else {
            currentSender = lastSender || '用户A';
            currentBlock = [trimmedLine];
          }
        } else {
          // 真正的延续内容
          currentBlock.push(parsed.content);
        }
      } else {
        currentBlock.push(parsed.content);
      }
    }
  }

  // 保存最后一个块
  if (currentBlock.length > 0 && currentSender) {
    result.push(`${currentSender}: ${currentBlock.join(' ')}`);
  }

  return result;
}

export function parseConversation(text: string, users: UserProfile[]): ParseResult {
  const rawLines = text.split('\n');
  
  // 合并多行消息
  const mergedLines = mergeMultiLineContent(rawLines);
  
  const messages: Message[] = [];
  
  // 收集解析到的所有发送者（保持顺序）
  const discoveredSenders: string[] = [];
  const senderSet = new Set<string>();
  
  // 第一遍：收集所有发送者（按出现顺序）
  for (const line of mergedLines) {
    const parsed = parseLine(line);
    if (parsed && parsed.sender && !senderSet.has(parsed.sender)) {
      senderSet.add(parsed.sender);
      discoveredSenders.push(parsed.sender);
    }
  }

  // 角色分配：第一个发送者为 'user'（当事人，右侧），其他为 'assistant'（左侧）
  const roleAssignment = new Map<string, 'user' | 'assistant'>();
  
  // 已有用户保留原角色
  users.forEach((user) => {
    roleAssignment.set(user.name, user.role);
  });
  
  // 新发现的用户：第一个为 'user'，其他为 'assistant'
  discoveredSenders.forEach((sender, index) => {
    if (!roleAssignment.has(sender)) {
      const role = index === 0 ? 'user' : 'assistant';
      roleAssignment.set(sender, role);
    }
  });

  // 生成消息
  for (const line of mergedLines) {
    const parsed = parseLine(line);
    if (!parsed || !parsed.content || !parsed.sender) continue;

    const sender = parsed.sender;
    const role = roleAssignment.get(sender) || 'user';

    // 查找匹配的用户配置
    const matchedUser = users.find(u => 
      u.name === sender || 
      u.name.toLowerCase() === sender.toLowerCase()
    );

    const finalSender = matchedUser?.name || sender;
    const finalRole = matchedUser?.role || role;

    messages.push({
      id: crypto.randomUUID(),
      role: finalRole,
      sender: finalSender,
      avatar: matchedUser?.avatar || generateAvatar(finalSender),
      content: parsed.content,
      type: 'text',
      timestamp: Date.now() + messages.length * 1000,
    });
  }

  // 收集新用户（按顺序）
  const existingNames = new Set(users.map(u => u.name.toLowerCase()));
  const newUsers = discoveredSenders.filter(s => !existingNames.has(s.toLowerCase()));

  return { messages, newUsers };
}

// 测试函数
export function testParse(text: string): { success: boolean; lines: Array<{ sender: string; content: string }> } {
  const rawLines = text.split('\n');
  const mergedLines = mergeMultiLineContent(rawLines);
  
  const results: Array<{ sender: string; content: string }> = [];
  
  for (const line of mergedLines) {
    const parsed = parseLine(line);
    if (parsed && parsed.sender) {
      results.push({ sender: parsed.sender, content: parsed.content });
    } else {
      results.push({ sender: '(未识别)', content: line });
    }
  }

  return {
    success: results.every(r => r.sender !== '(未识别)'),
    lines: results
  };
}
