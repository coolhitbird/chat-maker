import type { Message, ThemeStyles, UserProfile } from '@/types';
import { defaultLayoutConfig } from './messageLayout';
import { wechatEmojis } from '@/utils/emoji';

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#0ea5e9', '#a78bfa'
];

// Emoji map for canvas rendering
const EMOJI_MAP = new Map(wechatEmojis.map(e => [e.key, e]));

function getInitials(name: string): string {
  if (!name) return '?';
  if (name.length === 1) return name.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getSystemMessageStyleForCanvas(type?: string): { bg: string; color: string; fontStyle: string; icon: string } {
  switch (type) {
    case 'recall':
      return { bg: '#f5f5f5', color: '#999', fontStyle: 'italic', icon: '↩️' };
    case 'pat':
      return { bg: '#fff8e1', color: '#ff9800', fontStyle: 'normal', icon: '🤚' };
    case 'addFriend':
      return { bg: '#e3f2fd', color: '#1976d2', fontStyle: 'normal', icon: '👤' };
    case 'invite':
      return { bg: '#e8f5e9', color: '#388e3c', fontStyle: 'normal', icon: '👥' };
    case 'warning':
      return { bg: '#fff3cd', color: '#856404', fontStyle: 'normal', icon: '⚠️' };
    case 'notification':
      return { bg: '#fff3e0', color: '#e65100', fontStyle: 'normal', icon: '📢' };
    default:
      return { bg: '#f0f0f0', color: '#666', fontStyle: 'normal', icon: 'ℹ️' };
  }
}

// ============================================================================
// 核心修复 1: 符合 Unicode Line Break Algorithm 的智能换行
// 参考 CSS word-break: break-word 行为
// ============================================================================
interface TextFragment {
  type: 'text' | 'emoji';
  content: string;
  emojiUrl?: string;
}

function parseFragments(content: string): TextFragment[] {
  const fragments: TextFragment[] = [];
  const emojiPattern = /(\[[^\]]{1,10}\])/g;
  let lastIndex = 0;
  let match;

  while ((match = emojiPattern.exec(content)) !== null) {
    // Text before emoji
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index);
      if (text) fragments.push({ type: 'text', content: text });
    }

    const emoji = EMOJI_MAP.get(match[0]);
    if (emoji) {
      fragments.push({ type: 'emoji', content: match[0], emojiUrl: emoji.url });
    } else {
      // Unknown "[xxx]" pattern, treat as text
      fragments.push({ type: 'text', content: match[0] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex);
    if (text) fragments.push({ type: 'text', content: text });
  }

  return fragments;
}

// Measure a string's width using Canvas text API
function measureTextWidth(ctx: CanvasRenderingContext2D, text: string): number {
  return ctx.measureText(text).width;
}

// 计算文本的行数（与 wrapTextFragments 保持一致的换行逻辑）
function countTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, fontSize: number, fontFamily: string): number {
  if (!text) return 1;
  
  ctx.font = `${fontSize}px "${fontFamily}"`;
  
  const isChinese = /[\u4e00-\u9fa5]/.test(text);
  
  if (isChinese || !text.includes(' ')) {
    // 中文或无空格文本：按字符换行
    let lineCount = 1;
    let part = '';
    
    for (const char of text) {
      const newWidth = measureTextWidth(ctx, part + char);
      if (newWidth > maxWidth && part) {
        lineCount++;
        part = char;
      } else {
        part += char;
      }
    }
    
    return lineCount;
  } else {
    // 英文文本：按单词换行
    const words = text.split(' ');
    let lineCount = 1;
    let currentLineWidth = 0;
    
    for (const word of words) {
      const wordWidth = measureTextWidth(ctx, word);
      const spaceWidth = measureTextWidth(ctx, ' ');
      
      if (currentLineWidth + wordWidth > maxWidth && currentLineWidth > 0) {
        lineCount++;
        currentLineWidth = wordWidth;
      } else {
        currentLineWidth += wordWidth + spaceWidth;
      }
    }
    
    return lineCount;
  }
}

// Wrap text - 按单词换行（英文保持单词完整，中文按字符换行）
function wrapTextFragments(
  ctx: CanvasRenderingContext2D,
  fragments: TextFragment[],
  maxWidth: number,
  emojiSize: number
): TextFragment[][] {
  const lines: TextFragment[][] = [];
  let currentLine: TextFragment[] = [];
  let currentLineWidth = 0;

  for (const fragment of fragments) {
    if (fragment.type === 'emoji') {
      const emojiWidth = emojiSize;
      if (currentLineWidth + emojiWidth > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = [];
        currentLineWidth = 0;
      }
      currentLine.push(fragment);
      currentLineWidth += emojiWidth + 2;
      continue;
    }

    const text = fragment.content;
    const isChinese = /[\u4e00-\u9fa5]/.test(text);
    
    if (isChinese || !text.includes(' ')) {
      // 中文或无空格文本：按字符换行
      let part = '';
      
      for (const char of text) {
        const newWidth = measureTextWidth(ctx, part + char);
        
        if (newWidth > maxWidth && part) {
          currentLine.push({ type: 'text', content: part });
          lines.push(currentLine);
          currentLine = [];
          currentLineWidth = 0;
          part = char;
        } else {
          part += char;
        }
      }
      
      if (part) {
        currentLine.push({ type: 'text', content: part });
        currentLineWidth = measureTextWidth(ctx, part);
      }
    } else {
      // 英文文本：按单词换行
      const words = text.split(' ');
      
      for (const word of words) {
        const wordWidth = measureTextWidth(ctx, word);
        
        if (currentLineWidth + wordWidth > maxWidth && currentLine.length > 0) {
          lines.push(currentLine);
          currentLine = [];
          currentLineWidth = 0;
        }
        
        if (wordWidth > maxWidth) {
          // 单词本身超过宽度，按字符换行
          let part = '';
          for (const char of word) {
            const charWidth = measureTextWidth(ctx, part + char);
            if (charWidth > maxWidth && part) {
              currentLine.push({ type: 'text', content: part });
              lines.push(currentLine);
              currentLine = [];
              currentLineWidth = 0;
              part = char;
            } else {
              part += char;
            }
          }
          if (part) {
            currentLine.push({ type: 'text', content: part });
            currentLineWidth += measureTextWidth(ctx, part);
          }
        } else {
          currentLine.push({ type: 'text', content: word });
          currentLineWidth += wordWidth + measureTextWidth(ctx, ' '); // 空格宽度
        }
      }
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [[]];
}

export interface RenderOptions {
  width: number;
  height: number;
  styles: ThemeStyles;
  title: string;
  messages: Message[];
  users: UserProfile[];
  scale?: number;
  /** 预加载好的 emoji 图片缓存（由调用方同步预加载后传入）*/
  emojiCache?: Map<string, HTMLImageElement>;
  /** 预加载好的消息图片缓存（由调用方异步预加载后传入）*/
  imageCache?: Map<string, HTMLImageElement>;
  /** 深色模式 */
  darkMode?: boolean;
}

/** 同步预加载一组图片（通过 XHR），返回 Map */
function preloadImagesSync(urls: string[]): Map<string, HTMLImageElement> {
  const cache = new Map<string, HTMLImageElement>();
  for (const url of urls) {
    if (cache.has(url)) continue;
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      // 使用同步 XHR（图片较小，加载很快）
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, false); // false = synchronous
      xhr.send();
      if (xhr.status === 200) {
        img.src = url;
        cache.set(url, img);
      }
      // 忽略 404 等错误，不打印控制台
    } catch {
      // 忽略加载失败
    }
  }
  return cache;
}

/** 预加载所有微信表情图片（一次性缓存，供整个会话使用）*/
let globalEmojiCache: Map<string, HTMLImageElement> | null = null;
function getGlobalEmojiCache(): Map<string, HTMLImageElement> {
  if (globalEmojiCache) return globalEmojiCache;
  
  // 检查第一个 URL 是否有效，如果无效则跳过预加载
  const urls = wechatEmojis.map(e => e.url);
  if (urls.length > 0) {
    // 只预加载第一个 URL 来检查是否有效
    try {
      const testXhr = new XMLHttpRequest();
      testXhr.open('HEAD', urls[0], false);
      testXhr.send(null); // 传递 null 作为参数
      if (testXhr.status !== 200) {
        // 如果第一个 URL 无效，返回空缓存
        globalEmojiCache = new Map();
        return globalEmojiCache;
      }
    } catch {
      // 如果请求失败，返回空缓存
      globalEmojiCache = new Map();
      return globalEmojiCache;
    }
  }
  
  globalEmojiCache = preloadImagesSync(urls);
  return globalEmojiCache;
}

export function renderChatToCanvas(canvas: HTMLCanvasElement, options: RenderOptions): void {
  const { width, height, styles, title, messages, users, emojiCache, imageCache, darkMode = false, scale: customScale } = options;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 使用传入的缓存或全局缓存
  const emojiImgCache = emojiCache ?? getGlobalEmojiCache();
  const msgImageCache = imageCache ?? new Map<string, HTMLImageElement>();

  const userAvatarMap = new Map<string, string>();
  users.forEach(u => userAvatarMap.set(u.name, u.avatar));

  const isMobile = width < height;
  
  // Calculate scale factor if not provided
  const BASE_WIDTH = 375;
  const scale = customScale ?? (width / BASE_WIDTH);
  
  const headerHeight = Math.round(styles.avatarSize * scale) + Math.round(8 * scale);
  const statusBarHeight = isMobile ? Math.round(24 * scale) : 0;
  const avatarSize = Math.round(styles.avatarSize * scale);
  const gap = Math.round(styles.messageGap * scale);
  const bubblePaddingH = Math.round((styles.bubblePadding + 2) * scale);
  const bubblePaddingV = Math.round(styles.bubblePadding * scale);
  const bubbleRadius = Math.round(styles.bubbleRadius * scale);
  const fontSize = Math.round(styles.fontSize * scale);
  const lineHeightRatio = 1.4;
  const contentPadding = Math.round(styles.messageGap * scale);


  
  // Emoji size = 1.2x font size (微信表情实际比例)
  const emojiSize = Math.round(fontSize * 1.2);

  ctx.font = `${fontSize}px "${styles.fontFamily.replace(/"/g, '')}"`;

  // Available width for bubbles (accounting for avatars and gaps on both sides)
  // Layout: [padding][avatar][gap][bubble area][gap][avatar][padding]
  // 最大气泡宽度 = 总宽度 - 两个头像 - contentPadding*2 - gap*2
  const maxBubbleWidth = width - avatarSize * 2 - contentPadding * 2 - gap * 2;

  // Pre-parse all message fragments and compute layout
  const senderNameHeightRatio = defaultLayoutConfig.avatarSection.senderName.heightRatio;
  const senderNameHeight = avatarSize * senderNameHeightRatio;
  
  // 特殊消息的固定高度（按比例缩放）
  const redPacketHeight = Math.round(102 * scale);
  const transferHeight = Math.round(120 * scale);
  const voiceBubbleHeight = Math.round(40 * scale);
  const imageBubbleHeight = Math.round(200 * scale);
  
  // 行高在循环外计算一次
  const lineHeightPx = fontSize * lineHeightRatio;
  
  const messageData = messages.map(msg => {
    const fragments = parseFragments(msg.content);
    const lines = wrapTextFragments(ctx, fragments, maxBubbleWidth - bubblePaddingH * 2, emojiSize);
    const textHeight = lines.length * lineHeightPx;
    
    // 特殊消息使用固定高度，普通消息使用文字高度
    let bubbleHeight: number;
    if (msg.type === 'redpacket') {
      bubbleHeight = redPacketHeight;
    } else if (msg.type === 'transfer') {
      bubbleHeight = transferHeight;
    } else if (msg.type === 'voice' && msg.voice) {
      bubbleHeight = voiceBubbleHeight;
    } else if (msg.type === 'image') {
      bubbleHeight = imageBubbleHeight;
    } else {
      bubbleHeight = textHeight + bubblePaddingV * 2;
    }

    return { msg, fragments, lines, bubbleHeight };
  });

  // 第一次计算：估算语音消息高度（用于设置 canvas 大小）
  for (const data of messageData) {
    if (data.msg.type === 'voice' && data.msg.voice && data.msg.voice.text) {
      const voiceText = data.msg.voice.text;
      // 估算：假设每行约 15 字符
      const estimatedLines = Math.ceil(voiceText.length / 15);
      const estimatedHeight = voiceBubbleHeight + estimatedLines * lineHeightPx;
      data.bubbleHeight = estimatedHeight;
    }
  }

  // Calculate total height needed
  let totalContentHeight = contentPadding;
  for (const data of messageData) {
    const contentHeight = senderNameHeight + data.bubbleHeight;
    const rowHeight = Math.max(avatarSize, contentHeight) + gap;
    totalContentHeight += rowHeight;
  }
  
  const actualHeight = Math.max(height, statusBarHeight + headerHeight + totalContentHeight + contentPadding);

  // Handle HiDPI/Retina scaling
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = actualHeight * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${actualHeight}px`;
  ctx.scale(dpr, dpr);

  // Re-set font after scaling
  ctx.font = `${fontSize}px "${styles.fontFamily.replace(/"/g, '')}"`;

  // ============================================================================
  // Draw background
  // ============================================================================
  ctx.fillStyle = darkMode ? '#1f1f1f' : styles.background;
  ctx.fillRect(0, 0, width, actualHeight);

  // ============================================================================
  // Draw status bar (mobile only)
  // ============================================================================
  if (isMobile) {
    const showStatusBar = styles.showStatusBar !== false;
    if (showStatusBar) {
      const statusBg = darkMode ? '#1a1a1a' : (styles.statusBarBg || styles.headerBg);
      const statusColor = darkMode ? '#888' : (styles.statusBarColor || styles.headerColor);
      ctx.fillStyle = statusBg;
      ctx.fillRect(0, 0, width, statusBarHeight);

      const statusFontSize = Math.round(10 * scale);
      ctx.fillStyle = statusColor;
      ctx.font = `500 ${statusFontSize}px "${styles.fontFamily.replace(/"/g, '')}"`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('10:30', Math.round(8 * scale), statusBarHeight / 2);

      // Signal bars (from tallest (left) to shortest (right))
      const signalX = width - Math.round(80 * scale);
      const signalY = statusBarHeight / 2;
      ctx.fillStyle = statusColor;
      for (let i = 0; i < 4; i++) {
        const barH = Math.round((12 - i * 2) * scale); // 12, 10, 8, 6 - tallest to shortest
        const barW = Math.round(3 * scale);
        const barGap = Math.round(5 * scale);
        ctx.fillRect(signalX + i * barGap, signalY - barH / 2, barW, barH);
      }

      // WiFi icon
      const wifiX = width - Math.round(50 * scale);
      const wifiR1 = Math.round(2 * scale);
      const wifiR2 = Math.round(5 * scale);
      const wifiR3 = Math.round(8 * scale);
      ctx.beginPath();
      ctx.arc(wifiX, signalY, wifiR1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(wifiX, signalY, wifiR2, Math.PI, 0, true);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(wifiX, signalY, wifiR3, Math.PI, 0, true);
      ctx.stroke();

      // Battery icon
      const batteryX = width - Math.round(30 * scale);
      const batteryW = Math.round(16 * scale);
      const batteryH = Math.round(8 * scale);
      const batteryNubW = Math.round(2 * scale);
      const batteryNubH = Math.round(4 * scale);
      ctx.strokeStyle = statusColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(batteryX, signalY - batteryH / 2, batteryW, batteryH);
      ctx.fillRect(batteryX + 1, signalY - batteryH / 2 + Math.round(scale), batteryW - 2, batteryH - Math.round(2 * scale));
      ctx.fillRect(batteryX + batteryW, signalY - batteryNubH / 2, batteryNubW, batteryNubH);
    }
  }

  // ============================================================================
  // Draw header
  // ============================================================================
  ctx.fillStyle = darkMode ? '#2d2d2d' : styles.headerBg;
  ctx.fillRect(0, statusBarHeight, width, headerHeight);

  const headerFontSize = Math.max(Math.round(12 * scale), Math.round(fontSize * 0.9));
  ctx.fillStyle = darkMode ? '#ffffff' : styles.headerColor;
  ctx.font = `500 ${headerFontSize}px "${styles.fontFamily.replace(/"/g, '')}"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, width / 2, statusBarHeight + headerHeight / 2);

  ctx.font = `${fontSize}px "${styles.fontFamily.replace(/"/g, '')}"`;

  // ============================================================================
  // Draw messages
  // ============================================================================
  const chatTop = statusBarHeight + headerHeight;
  let y = chatTop + contentPadding;
  
  // 用户名高度（在循环外计算一次）
  const senderNameHeightPx = avatarSize * senderNameHeightRatio;

  for (const data of messageData) {
    const { msg, lines } = data;
    const bubbleHeight = data.bubbleHeight;
    const isUser = msg.role === 'user';
    // 深色模式下的气泡背景和文字颜色
    const bubbleBg = darkMode 
      ? (isUser ? '#128400' : '#2d2d2d') 
      : (isUser ? styles.bubbleRightBg : styles.bubbleLeftBg);
    const bubbleColor = darkMode 
      ? '#ffffff' 
      : (isUser ? styles.bubbleRightColor : styles.bubbleLeftColor);

    // 系统消息：居中显示
    if (msg.type === 'system' && msg.system) {
      const systemStyle = getSystemMessageStyleForCanvas(msg.system.type);
      const systemText = msg.system.text;
      
      const systemFontSize = Math.round(12 * scale);
      const systemPaddingH = Math.round(20 * scale);
      const systemHeight = Math.round(30 * scale);
      
      ctx.font = `${systemFontSize}px "${styles.fontFamily.replace(/"/g, '')}"`;
      const textWidth = ctx.measureText(systemText).width + systemPaddingH * 2;
      const systemX = (width - textWidth) / 2;
      const systemY = y;
      
      drawBubble(ctx, systemX, systemY, textWidth, systemHeight, Math.round(12 * scale), systemStyle.bg);
      
      ctx.fillStyle = systemStyle.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${systemFontSize}px "${styles.fontFamily.replace(/"/g, '')}"`;
      ctx.fillText(`${systemStyle.icon} ${systemText}`, width / 2, systemY + systemHeight / 2);
      ctx.font = `${fontSize}px "${styles.fontFamily.replace(/"/g, '')}"`;
      
      y += systemHeight + gap;
      continue;
    }

    const avatarX = isUser ? width - contentPadding - avatarSize : contentPadding;
    const avatarY = y;

    // Draw avatar
    drawAvatar(ctx, avatarX, avatarY, avatarSize, msg.sender);

    // ============================================================================
    // 布局结构（与 CSS 预览一致）：
    // [avatar] [用户名]
    //          [气泡]
    // ============================================================================
    
    // Sender name - 用户名占据头像高度的前 33%
    const senderHeight = fontSize * 0.7;
    const senderX = isUser
      ? avatarX - gap
      : avatarX + gap + avatarSize;
    const senderY = y + senderNameHeightPx; // 用户名底部对齐到 senderNameHeightPx 处

    ctx.fillStyle = '#888888';
    ctx.font = `${senderHeight}px "${styles.fontFamily.replace(/"/g, '')}"`;
    ctx.textAlign = isUser ? 'right' : 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(msg.sender, senderX, senderY);

    // 修复：使用正确的字体大小计算气泡宽度
    // 在计算文字宽度前设置 fontSize，确保与渲染时的字体一致
    ctx.font = `${fontSize}px "${styles.fontFamily.replace(/"/g, '')}"`;
    
    // Bubble dimensions - 气泡从用户名下方开始
    const maxLineWidth = Math.max(
      ...lines.map(line => {
        let w = 0;
        for (const frag of line) {
          if (frag.type === 'emoji') w += emojiSize + 2;
          else w += measureTextWidth(ctx, frag.content);
        }
        return w;
      })
    );
    
    // 红包消息的固定宽度
    const redPacketWidth = Math.round(180 * scale);
    // 转账消息的最小宽度
    const transferMinWidth = Math.round(180 * scale);
    // 图片消息的固定宽度（正方形）
    const imageWidth = msg.type === 'image' ? Math.round(200 * scale) : 0;
    
    let actualMaxLineWidth: number;
    if (msg.type === 'redpacket') {
      actualMaxLineWidth = redPacketWidth;
    } else if (msg.type === 'transfer') {
      actualMaxLineWidth = Math.max(maxLineWidth, transferMinWidth);
    } else if (msg.type === 'voice' && msg.voice) {
      // 语音消息宽度计算：图标 + 波形(可变) + 时长 + padding（都按scale缩放）
      const iconArea = Math.round(16 * scale);
      const durationArea = Math.round(40 * scale);
      const waveformArea = Math.max(Math.round(60 * scale), Math.round((msg.voice.duration || 5) * 8 * scale));
      const voiceControlWidth = bubblePaddingH + iconArea + bubblePaddingH + waveformArea + durationArea + bubblePaddingH;
      
      // 如果有文字，估算文字需要的宽度
      let textWidth = 0;
      if (msg.voice.text) {
        const estimatedCharsPerLine = Math.floor((maxBubbleWidth - bubblePaddingH * 2) / (fontSize * 0.6));
        const lines = Math.ceil(msg.voice.text.length / estimatedCharsPerLine);
        if (lines === 1) {
          ctx.font = `${fontSize}px "${styles.fontFamily.replace(/"/g, '')}"`;
          textWidth = Math.min(ctx.measureText(msg.voice.text).width + bubblePaddingH * 2, maxBubbleWidth);
        } else {
          textWidth = maxBubbleWidth;
        }
      }
      
      actualMaxLineWidth = Math.max(voiceControlWidth, textWidth);
    } else if (msg.type === 'image') {
      actualMaxLineWidth = imageWidth;
    } else {
      actualMaxLineWidth = maxLineWidth;
    }
    
    const bubbleWidth = Math.min(actualMaxLineWidth + bubblePaddingH * 2, maxBubbleWidth);
    const bubbleX = isUser
      ? avatarX - gap - bubbleWidth
      : avatarX + gap + avatarSize;
    const bubbleY = y + senderNameHeightPx;
    
    // 语音消息：如果有文字，计算实际高度
    const effectiveBubbleHeight = (msg.type === 'voice' && msg.voice && msg.voice.text)
      ? (() => {
        const voiceText = msg.voice.text;
        const textContentWidth = bubbleWidth - bubblePaddingH * 2;
        const voiceLineCount = countTextLines(ctx, voiceText, textContentWidth, fontSize, styles.fontFamily);
        return Math.round(40 * scale) + voiceLineCount * lineHeightPx;
      })()
      : bubbleHeight;
    
    // ============================================================================
    // 核心修复 3: 添加 clip() 防止文字溢出（仅对普通文字消息）
    // ============================================================================
    const isSpecialMessage = msg.type === 'redpacket' || msg.type === 'transfer';
    ctx.save();
    
    // 只有普通消息才使用 clip，特殊消息不使用
    if (!isSpecialMessage) {
      drawBubble(ctx, bubbleX, bubbleY, bubbleWidth, effectiveBubbleHeight, bubbleRadius, bubbleBg);
      ctx.clip();
    }

    // 检查是否为红包消息
    if (msg.type === 'redpacket' && msg.redPacket) {
      // 绘制红包消息（使用样式配置）
      drawBubble(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, bubbleRadius, '#fff');
      const redPacket = msg.redPacket;
      
      // 计算各部分高度（按比例缩放）
      const iconSize = Math.round(48 * scale);
      const bodyPadding = Math.round(12 * scale);
      const footerHeight = Math.round(32 * scale);
      const bodyHeight = bubbleHeight - footerHeight;
      const iconFontSize = Math.round(iconSize * 0.5);
      const titleFontSize = Math.round(16 * scale);
      const contentFontSize = Math.round(12 * scale);
      const footerFontSize = Math.round(11 * scale);
      
      // 1. 绘制主体区域（橙红色渐变）
      const gradient = ctx.createLinearGradient(bubbleX, bubbleY, bubbleX + bubbleWidth, bubbleY + bodyHeight);
      gradient.addColorStop(0, '#FFB347');
      gradient.addColorStop(1, '#FF6B6B');
      
      // 圆角矩形背景（只绘制上半部分）
      ctx.beginPath();
      ctx.moveTo(bubbleX + bubbleRadius, bubbleY);
      ctx.lineTo(bubbleX + bubbleWidth - bubbleRadius, bubbleY);
      ctx.arcTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + bubbleRadius, bubbleRadius);
      ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bodyHeight);
      ctx.lineTo(bubbleX, bubbleY + bodyHeight);
      ctx.lineTo(bubbleX, bubbleY + bubbleRadius);
      ctx.arcTo(bubbleX, bubbleY, bubbleX + bubbleRadius, bubbleY, bubbleRadius);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // 2. 绘制钱袋图标（黄色圆形）
      const iconX = bubbleX + bodyPadding;
      const iconY = bubbleY + (bodyHeight - iconSize) / 2;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(iconX + iconSize/2, iconY + iconSize/2, iconSize/2, 0, Math.PI * 2);
      ctx.fill();
      
      // 钱袋图标内文字
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${iconFontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🧧', iconX + iconSize/2, iconY + iconSize/2);
      
      // 3. 绘制标题"红包"（白色，加粗）
      const contentX = iconX + iconSize + Math.round(12 * scale);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${titleFontSize}px "${styles.fontFamily.replace(/"/g, '')}"`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('红包', contentX, iconY + Math.round(6 * scale));
      
      // 4. 绘制祝福语（白色，小字）
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `${contentFontSize}px "${styles.fontFamily.replace(/"/g, '')}"`;
      ctx.fillText(redPacket.greeting, contentX, iconY + titleFontSize + Math.round(10 * scale));
      
      // 5. 绘制底部状态栏（白色背景）
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fillRect(bubbleX, bubbleY + bodyHeight, bubbleWidth, footerHeight);
      
      // 分割线
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(bubbleX, bubbleY + bodyHeight);
      ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bodyHeight);
      ctx.stroke();
      
      // 状态文字（灰色）
      ctx.fillStyle = '#999';
      ctx.font = `${footerFontSize}px "${styles.fontFamily.replace(/"/g, '')}"`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const statusText = redPacket.isOpened ? `已领取 ¥${(redPacket.amount / 100).toFixed(2)}` : '领取红包';
      ctx.fillText(statusText, bubbleX + bubbleWidth / 2, bubbleY + bodyHeight + footerHeight / 2);
      
    } else if (msg.type === 'transfer' && msg.transfer) {
      // 绘制转账消息
      const transfer = msg.transfer;
      
      // 计算各部分高度（按比例缩放）
      const iconSize = Math.round(44 * scale);
      const bodyPadding = Math.round(12 * scale);
      const footerHeight = Math.round(32 * scale);
      const bodyHeight = bubbleHeight - footerHeight;
      const titleFontSize = Math.round(16 * scale);
      const amountFontSize = Math.round(18 * scale);
      const footerFontSize = Math.round(11 * scale);
      
      // 1. 绘制主体区域（灰色背景）
      ctx.fillStyle = '#f5f5f5';
      ctx.beginPath();
      ctx.moveTo(bubbleX + bubbleRadius, bubbleY);
      ctx.lineTo(bubbleX + bubbleWidth - bubbleRadius, bubbleY);
      ctx.arcTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + bubbleRadius, bubbleRadius);
      ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bodyHeight);
      ctx.lineTo(bubbleX, bubbleY + bodyHeight);
      ctx.lineTo(bubbleX, bubbleY + bubbleRadius);
      ctx.arcTo(bubbleX, bubbleY, bubbleX + bubbleRadius, bubbleY, bubbleRadius);
      ctx.closePath();
      ctx.fill();
      
      // 2. 绘制转账图标（绿色圆形）
      const iconX = bubbleX + bodyPadding;
      const iconY = bubbleY + (bodyHeight - iconSize) / 2;
      ctx.fillStyle = '#07c160'; // 微信绿
      ctx.beginPath();
      ctx.arc(iconX + iconSize/2, iconY + iconSize/2, iconSize/2, 0, Math.PI * 2);
      ctx.fill();
      
      // 图标内文字 "¥"
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.round(iconSize * 0.45)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('¥', iconX + iconSize/2, iconY + iconSize/2);
      
      // 3. 绘制标题"转账"（深色）
      const contentX = iconX + iconSize + Math.round(12 * scale);
      ctx.fillStyle = '#333';
      ctx.font = `bold ${titleFontSize}px "${styles.fontFamily.replace(/"/g, '')}"`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('转账', contentX, iconY + Math.round(4 * scale));
      
      // 4. 绘制金额（大号深色）
      ctx.fillStyle = '#333';
      ctx.font = `bold ${amountFontSize}px "${styles.fontFamily.replace(/"/g, '')}"`;
      ctx.fillText(`¥${(transfer.amount / 100).toFixed(2)}`, contentX, iconY + titleFontSize + Math.round(10 * scale));
      
      // 5. 绘制底部状态栏（白色背景）
      ctx.fillStyle = '#fff';
      ctx.fillRect(bubbleX, bubbleY + bodyHeight, bubbleWidth, footerHeight);
      
      // 分割线
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(bubbleX, bubbleY + bodyHeight);
      ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bodyHeight);
      ctx.stroke();
      
      // 状态文字（绿色表示已收款，灰色表示待收款）
      ctx.fillStyle = transfer.isReceived ? '#07c160' : '#999';
      ctx.font = `${footerFontSize}px "${styles.fontFamily.replace(/"/g, '')}"`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const statusText = transfer.isReceived ? '已收款' : '待收款';
      ctx.fillText(statusText, bubbleX + bubbleWidth / 2, bubbleY + bodyHeight + footerHeight / 2);
      
    } else if (msg.type === 'voice' && msg.voice) {
      const voice = msg.voice;
      const iconSize = Math.round(16 * scale);
      const waveHeight = Math.round(24 * scale);
      const barWidth = Math.max(1, Math.round(3 * scale));
      const barGap = Math.max(1, Math.round(2 * scale));
      const waveAreaHeight = Math.round(40 * scale);
      const durationFontSize = Math.round(12 * scale);
      
      // 时长文字宽度（估算）
      const durationText = `${voice.duration}"`;
      ctx.font = `${durationFontSize}px "${styles.fontFamily.replace(/"/g, '')}"`;
      const durationWidth = ctx.measureText(durationText).width + Math.round(8 * scale);
      
      // 波形区域宽度 = 气泡宽度 - 左侧padding - 图标 - 时长区域
      const waveRegionWidth = bubbleWidth - bubblePaddingH * 2 - iconSize - bubblePaddingH - durationWidth;
      const waveCount = Math.max(8, Math.floor(waveRegionWidth / (barWidth + barGap)));
      
      // 生成波形数据
      const waveformData: number[] = [];
      for (let i = 0; i < waveCount; i++) {
        waveformData.push(Math.sin(i * 0.5) * 0.5 + 0.5);
      }
      
      // 语音气泡总高度
      const voiceBubbleHeight = effectiveBubbleHeight;
      
      // 绘制气泡背景
      drawBubble(ctx, bubbleX, bubbleY, bubbleWidth, voiceBubbleHeight, bubbleRadius, bubbleBg);
      
      // 计算波形区域的左右边界
      const waveLeftX = bubbleX + bubblePaddingH + iconSize + bubblePaddingH;
      const waveRightX = bubbleX + bubbleWidth - bubblePaddingH - durationWidth;
      
      // 绘制播放图标（三角形）- 垂直居中
      const iconX = bubbleX + bubblePaddingH;
      const iconY = bubbleY + (waveAreaHeight - iconSize) / 2;
      ctx.fillStyle = bubbleColor;
      ctx.beginPath();
      ctx.moveTo(iconX, iconY);
      ctx.lineTo(iconX, iconY + iconSize);
      ctx.lineTo(iconX + iconSize, iconY + iconSize / 2);
      ctx.closePath();
      ctx.fill();
      
      // 绘制语音波形 - 垂直居中
      const waveY = bubbleY + (waveAreaHeight - waveHeight) / 2;
      const waveColor = darkMode 
        ? 'rgba(255,255,255,0.8)' 
        : (isUser ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.3)');
      ctx.fillStyle = waveColor;
      for (let i = 0; i < waveCount; i++) {
        const barH = (waveformData[i] * 0.8 + 0.2) * waveHeight;
        const barX = waveLeftX + i * (barWidth + barGap);
        const barY = waveY + (waveHeight - barH) / 2;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth, barH, 1);
        ctx.fill();
      }
      
      // 绘制时长 - 垂直居中
      ctx.fillStyle = darkMode ? 'rgba(255,255,255,0.8)' : (isUser ? 'rgba(255,255,255,0.8)' : '#999');
      ctx.font = `${durationFontSize}px "${styles.fontFamily.replace(/"/g, '')}"`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const durationX = waveRightX;
      ctx.fillText(durationText, durationX, bubbleY + waveAreaHeight / 2);
      
      // 绘制语音转文字内容（如果有）
      if (voice.text) {
        const textColor = darkMode ? '#ffffff' : bubbleColor;
        ctx.fillStyle = textColor;
        ctx.textBaseline = 'middle';
        
        const textContentWidth = bubbleWidth - bubblePaddingH * 2;
        const textTopPadding = Math.round(6 * scale);
        const textBottomPadding = Math.round(6 * scale);
        
        const textFragments = parseFragments(voice.text);
        const textLines = wrapTextFragments(ctx, textFragments, textContentWidth, emojiSize);
        
        const textAreaHeight = effectiveBubbleHeight - waveAreaHeight;
        const totalTextHeight = textLines.length * lineHeightPx;
        
        // 计算文字区域可用空间
        const availableHeight = textAreaHeight - textTopPadding - textBottomPadding;
        
        // 根据行数选择布局策略
        let startY: number;
        if (textLines.length === 1) {
          // 单行：垂直居中于可用空间
          startY = bubbleY + waveAreaHeight + textTopPadding + (availableHeight - totalTextHeight) / 2 + lineHeightPx / 2;
        } else {
          // 多行：从顶部开始填满可用空间
          const multiLineTopPadding = (availableHeight - totalTextHeight) / 2;
          startY = bubbleY + waveAreaHeight + Math.max(4, multiLineTopPadding) + lineHeightPx / 2;
        }
        
        for (let li = 0; li < textLines.length; li++) {
          const lineY = startY + lineHeightPx * li;
          let xOffset = 0;
          
          for (const frag of textLines[li]) {
            if (frag.type === 'emoji') {
              const cachedImg = emojiImgCache.get(frag.emojiUrl!);
              if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
                const emojiY = lineY + (lineHeightPx - emojiSize) / 2;
                ctx.drawImage(cachedImg, bubbleX + bubblePaddingH + xOffset, emojiY, emojiSize, emojiSize);
              }
              xOffset += emojiSize + 2;
            } else {
              const textX = bubbleX + bubblePaddingH + xOffset;
              ctx.textAlign = 'left';
              ctx.fillText(frag.content, textX, lineY);
              xOffset += measureTextWidth(ctx, frag.content);
            }
          }
        }
      }
    } else if (msg.type === 'image' && msg.image) {
      // 绘制图片消息（正方形）
      const imgPadding = Math.round(4 * scale);
      const imgSize = bubbleWidth - imgPadding * 2; // 正方形图片大小
      const imgBubbleHeight = imgSize; // 图片气泡高度等于图片大小
      const iconOuterRadius = Math.round(12 * scale);
      const iconInnerRadius = Math.round(8 * scale);
      
      // 使用 ctx.save 和 ctx.clip 裁剪图片区域
      ctx.save();
      
      // 绘制圆角矩形裁剪路径（高度等于宽度）
      ctx.beginPath();
      ctx.moveTo(bubbleX + bubbleRadius, bubbleY);
      ctx.lineTo(bubbleX + bubbleWidth - bubbleRadius, bubbleY);
      ctx.arcTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + bubbleRadius, bubbleRadius);
      ctx.lineTo(bubbleX + bubbleWidth, bubbleY + imgBubbleHeight - bubbleRadius);
      ctx.arcTo(bubbleX + bubbleWidth, bubbleY + imgBubbleHeight, bubbleX + bubbleWidth - bubbleRadius, bubbleY + imgBubbleHeight, bubbleRadius);
      ctx.lineTo(bubbleX + bubbleRadius, bubbleY + imgBubbleHeight);
      ctx.arcTo(bubbleX, bubbleY + imgBubbleHeight, bubbleX, bubbleY + imgBubbleHeight - bubbleRadius, bubbleRadius);
      ctx.lineTo(bubbleX, bubbleY + bubbleRadius);
      ctx.arcTo(bubbleX, bubbleY, bubbleX + bubbleRadius, bubbleY, bubbleRadius);
      ctx.closePath();
      ctx.clip();
      
      // 绘制背景
      ctx.fillStyle = msg.image.url ? '#000' : '#e0e0e0';
      ctx.fillRect(bubbleX + imgPadding, bubbleY + imgPadding, imgSize, imgSize);
      
      // 绘制图片（如果有URL）
      if (msg.image.url) {
        // 优先使用缓存的图片
        const cachedImg = msgImageCache.get(msg.image.url);
        
        if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
          ctx.drawImage(cachedImg, bubbleX + imgPadding, bubbleY + imgPadding, imgSize, imgSize);
        } else {
          // 尝试直接加载
          const tempImg = new Image();
          tempImg.crossOrigin = 'anonymous';
          tempImg.src = msg.image.url;
          
          if (tempImg.complete && tempImg.naturalWidth > 0) {
            ctx.drawImage(tempImg, bubbleX + imgPadding, bubbleY + imgPadding, imgSize, imgSize);
          } else {
            // 图片未加载，显示图片图标
            ctx.fillStyle = '#ccc';
            ctx.beginPath();
            ctx.arc(bubbleX + bubbleWidth / 2, bubbleY + imgBubbleHeight / 2, iconOuterRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(bubbleX + bubbleWidth / 2, bubbleY + imgBubbleHeight / 2, iconInnerRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else {
        // 没有图片URL，显示图片图标
        ctx.fillStyle = '#ccc';
        ctx.beginPath();
        ctx.arc(bubbleX + bubbleWidth / 2, bubbleY + imgBubbleHeight / 2, iconOuterRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(bubbleX + bubbleWidth / 2, bubbleY + imgBubbleHeight / 2, iconInnerRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // 恢复裁剪状态
      ctx.restore();
      
    } else {
      // 绘制普通文字消息
      // Draw text + emoji content
      ctx.fillStyle = bubbleColor;
      ctx.textBaseline = 'middle';

      // 文字垂直居中
      const totalTextHeight = lines.length * lineHeightPx;
      const startY = bubbleY + (bubbleHeight - totalTextHeight) / 2 + lineHeightPx / 2;

      for (let li = 0; li < lines.length; li++) {
        // 每行的 Y 坐标 = 起始Y + 行高 * 行号
        const lineY = startY + lineHeightPx * li;

        if (isUser) {
          // Right-aligned: 先计算整行宽度，再从右向左绘制
          let lineTotalWidth = 0;
          for (const frag of lines[li]) {
            if (frag.type === 'emoji') {
              lineTotalWidth += emojiSize + 2;
            } else {
              lineTotalWidth += measureTextWidth(ctx, frag.content);
            }
          }
          
          const rightEdgeX = bubbleX + bubbleWidth - bubblePaddingH;
          let xOffset = rightEdgeX - lineTotalWidth;
          
          for (const frag of lines[li]) {
            if (frag.type === 'emoji') {
              const cachedImg = emojiImgCache.get(frag.emojiUrl!);
              if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
                const emojiY = lineY + (lineHeightPx - emojiSize) / 2;
                ctx.drawImage(cachedImg, xOffset, emojiY, emojiSize, emojiSize);
              }
              xOffset += emojiSize + 2;
            } else {
              const textWidth = measureTextWidth(ctx, frag.content);
              ctx.textAlign = 'left';
              ctx.fillText(frag.content, xOffset, lineY);
              xOffset += textWidth;
            }
          }
        } else {
          // Left-aligned
          let xOffset = 0;
          for (const frag of lines[li]) {
            if (frag.type === 'emoji') {
              const cachedImg = emojiImgCache.get(frag.emojiUrl!);
              if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
                const emojiY = lineY + (lineHeightPx - emojiSize) / 2;
                ctx.drawImage(cachedImg, bubbleX + bubblePaddingH + xOffset, emojiY, emojiSize, emojiSize);
              }
              xOffset += emojiSize + 2;
            } else {
              const textX = bubbleX + bubblePaddingH + xOffset;
              ctx.textAlign = 'left';
              ctx.fillText(frag.content, textX, lineY);
              xOffset += measureTextWidth(ctx, frag.content);
            }
          }
        }
      }
    }

    ctx.restore();

    // Advance y position
    // 行高 = max(头像高度, 用户名高度 + 气泡高度) + 间距
    const contentHeight = senderNameHeightPx + effectiveBubbleHeight;
    const currentRowHeight = Math.max(avatarSize, contentHeight) + gap;
    y += currentRowHeight;
  }
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  name: string
): void {
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const radius = size / 2;

  const color = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  const initials = getInitials(name);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size * 0.38}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, centerX, centerY + 2);
}

function drawBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  bgColor: string
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fillStyle = bgColor;
  ctx.fill();
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to convert canvas to blob'));
    }, 'image/png');
  });
}

export function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}
