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

  // 特殊处理：特殊消息格式不是发送者（如 [红包]、[转账]、[语音]、[图片]）
  const specialFormats = ['[红包]', '[转账]', '[语音', '[图片]'];
  for (const format of specialFormats) {
    if (trimmedLine.startsWith(format)) {
      // 特殊消息格式作为延续内容
      return { sender: '', content: trimmedLine, isContinuation: true };
    }
  }

  // 检查是否是发送者行
  for (const { regex, extract } of senderPatterns) {
    const match = trimmedLine.match(regex);
    if (match) {
      const result = extract(match);
      // 再次检查提取的内容是否是特殊消息格式
      const isSpecial = specialFormats.some(format => result.content.startsWith(format));
      if (isSpecial) {
        // 如果是特殊消息格式，把整个行作为消息内容
        return { 
          sender: result.sender, 
          content: trimmedLine.replace(new RegExp(`^${result.sender}[:：]\\s*`), '').trim(),
          isContinuation: false 
        };
      }
      return { 
        sender: result.sender, 
        content: result.content, 
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
    
    // DEBUG: 检查解析结果
    console.log('[Parser] 解析行:', {
      line: line,
      parsed: parsed,
      hasContent: parsed?.content ? true : false,
      hasSender: parsed?.sender ? true : false
    });
    
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

    // 检查是否是特殊消息
    let messageType: 'text' | 'redpacket' | 'transfer' | 'voice' | 'image' = 'text';
    let redPacketData = undefined;
    let transferData = undefined;
    let voiceData = undefined;
    let imageData = undefined;
    let messageContent = parsed.content;

    // 红包消息
    if (parsed.content.startsWith('[红包]')) {
      messageType = 'redpacket';
      const content = parsed.content.replace('[红包]', '').trim();
      // 检查是否包含"已领"状态
      const isOpened = content.includes('已领');
      const greeting = content.replace('已领', '').trim() || '恭喜发财，大吉大利';
      messageContent = greeting;
      redPacketData = {
        amount: 200, // 默认2元
        greeting: greeting,
        sender: finalSender,
        isOpened: isOpened,
      };
    }
    // 转账消息
    else if (parsed.content.startsWith('[转账]')) {
      messageType = 'transfer';
      const content = parsed.content.replace('[转账]', '').trim();
      // 检查是否包含"已收"状态
      const isReceived = content.includes('已收');
      const cleanContent = content.replace('已收', '').trim();
      const amountMatch = cleanContent.match(/¥?(\d+\.?\d*)/);
      const amount = amountMatch ? parseFloat(amountMatch[1]) * 100 : 1000; // 默认10元
      const note = cleanContent.replace(/¥?\d+\.?\d*元?/, '').trim();
      messageContent = `转账 ¥${(amount / 100).toFixed(2)}`;
      transferData = {
        amount: amount,
        note: note || undefined,
        isReceived: isReceived,
        sender: finalSender,
      };
    }
    // 语音消息
    else if (parsed.content.startsWith('[语音')) {
      messageType = 'voice';
      const original = parsed.content;
      
      // 解析格式：[语音 10秒]转文字内容
      // 或：[语音]转文字内容
      const durationMatch = original.match(/\[语音\s*(\d+)(秒|s)?\]/);
      const duration = durationMatch ? parseInt(durationMatch[1]) : 5; // 默认5秒
      
      // 提取文字内容（删除 [语音...] 标签）
      const text = original.replace(/\[语音.*?\]/, '').trim();
      
      // DEBUG
      console.log('[Parser] 语音消息解析:', {
        original: original,
        durationMatch: durationMatch?.[0],
        duration: duration,
        text: text
      });
      
      messageContent = text || `[语音 ${duration}"]'`;
      voiceData = {
        duration: duration,
        text: text || undefined,
      };
    }
    // 图片消息
    else if (parsed.content.startsWith('[图片]')) {
      messageType = 'image';
      const caption = parsed.content.replace('[图片]', '').trim();
      messageContent = caption || '[图片]';
      imageData = {
        url: '',
        caption: caption || undefined,
      };
    }

    messages.push({
      id: crypto.randomUUID(),
      role: finalRole,
      sender: finalSender,
      avatar: matchedUser?.avatar || generateAvatar(finalSender),
      content: messageContent,
      type: messageType,
      timestamp: Date.now() + messages.length * 1000,
      redPacket: redPacketData,
      transfer: transferData,
      voice: voiceData,
      image: imageData,
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
    
    // DEBUG
    console.log(`[Parser] 解析行: "${line}" →`, parsed);
    
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

export function testVoiceParse(text: string): void {
  console.log('[Test] 语音解析测试:', text);
  const parsed = parseLine(text);
  console.log('[Test] 解析结果:', parsed);
}
