import type { Message, ThemeStyles, UserProfile } from '@/types';
import type { MessageStyleConfig } from '@/components/messages/wechat/types';
import { defaultLayoutConfig } from './messageLayout';
import { wechatEmojis } from '@/utils/emoji';
import { wechatRedPacketStyle } from '@/components/messages';

// 获取当前平台的样式（未来可通过参数动态切换）
function getRedPacketStyle(_platform: string): MessageStyleConfig {
  // 未来这里可以扩展更多平台
  // 现在只支持微信
  return wechatRedPacketStyle;
}

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

// Wrap text - 使用简单的字符级换行逻辑
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
    // 按字符处理，模拟 CSS word-break: break-all
    let part = '';
    
    for (const char of text) {
      const newWidth = measureTextWidth(ctx, part + char);
      
      if (newWidth > maxWidth && part) {
        // 当前行放不下新字符，换行
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
  const { width, height, styles, title, messages, users, emojiCache } = options;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 使用传入的缓存或全局缓存
  const imgCache = emojiCache ?? getGlobalEmojiCache();

  const userAvatarMap = new Map<string, string>();
  users.forEach(u => userAvatarMap.set(u.name, u.avatar));

  const isMobile = width < height;
  const headerHeight = styles.avatarSize + 8;
  const statusBarHeight = isMobile ? 24 : 0;
  const avatarSize = styles.avatarSize;
  const gap = styles.messageGap;
  const bubblePaddingH = styles.bubblePadding + 2;
  const bubblePaddingV = styles.bubblePadding;
  const bubbleRadius = styles.bubbleRadius;
  const fontSize = styles.fontSize;
  const lineHeightRatio = 1.4;
  const contentPadding = styles.messageGap;

  // DEBUG: 检查 fontSize
  console.log(`[Canvas] fontSize: ${fontSize}, width: ${width}, avatarSize: ${avatarSize}`);
  
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
  
  // 红包消息的固定高度（主体区域70px + 底部32px）
  const redPacketHeight = 102;
  
  const messageData = messages.map(msg => {
    const fragments = parseFragments(msg.content);
    const lines = wrapTextFragments(ctx, fragments, maxBubbleWidth - bubblePaddingH * 2, emojiSize);
    const lineHeightPx = fontSize * lineHeightRatio;
    const textHeight = lines.length * lineHeightPx;
    
    // 特殊消息使用固定高度，普通消息使用文字高度
    let bubbleHeight: number;
    if (msg.type === 'redpacket') {
      bubbleHeight = redPacketHeight;
    } else if (msg.type === 'transfer') {
      bubbleHeight = 120;
    } else if (msg.type === 'voice' && msg.voice) {
      // 语音消息高度 = 语音条高度 + 文字内容高度（如果有）
      const hasText = msg.voice.text && msg.voice.text.length > 0;
      bubbleHeight = hasText ? 80 : 50;
    } else if (msg.type === 'image') {
      bubbleHeight = 200; // 图片消息固定高度
    } else {
      bubbleHeight = textHeight + bubblePaddingV * 2;
    }

    // DEBUG: 检查 wrapTextFragments 的输出
    console.log(`[Canvas] msg: "${msg.content.slice(0, 20)}...", lines count: ${lines.length}, maxWidth: ${maxBubbleWidth - bubblePaddingH * 2}, type: ${msg.type}, bubbleHeight: ${bubbleHeight}`);
    lines.forEach((line, i) => {
      const lineText = line.map(f => f.content).join('');
      console.log(`  Line ${i}: "${lineText}" (width: ${line.map(f => measureTextWidth(ctx, f.content)).reduce((a, b) => a + b, 0)})`);
    });

    return { msg, fragments, lines, lineHeightPx, bubbleHeight };
  });

  // Calculate total height needed
  // 每行高度 = max(头像高度, 用户名高度 + 气泡高度) + 间距
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
  ctx.fillStyle = styles.background;
  ctx.fillRect(0, 0, width, actualHeight);

  // ============================================================================
  // Draw status bar (mobile only)
  // ============================================================================
  if (isMobile) {
    ctx.fillStyle = styles.headerBg;
    ctx.fillRect(0, 0, width, statusBarHeight);

    ctx.fillStyle = styles.headerColor;
    ctx.font = `500 10px "${styles.fontFamily.replace(/"/g, '')}"`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('10:30', 8, statusBarHeight / 2);

    // Signal bars
    const signalX = width - 80;
    const signalY = statusBarHeight / 2;
    ctx.fillStyle = styles.headerColor;
    for (let i = 0; i < 4; i++) {
      const barH = 4 + i * 2;
      ctx.fillRect(signalX + i * 5, signalY - barH / 2, 3, barH);
    }

    // WiFi icon
    const wifiX = width - 50;
    ctx.beginPath();
    ctx.arc(wifiX, signalY, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(wifiX, signalY, 5, Math.PI, 0, true);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(wifiX, signalY, 8, Math.PI, 0, true);
    ctx.stroke();

    // Battery icon
    const batteryX = width - 30;
    ctx.strokeStyle = styles.headerColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(batteryX, signalY - 4, 16, 8);
    ctx.fillRect(batteryX + 1, signalY - 3, 12, 6);
    ctx.fillRect(batteryX + 16, signalY - 2, 2, 4);
  }

  // ============================================================================
  // Draw header
  // ============================================================================
  ctx.fillStyle = styles.headerBg;
  ctx.fillRect(0, statusBarHeight, width, headerHeight);

  ctx.fillStyle = styles.headerColor;
  ctx.font = `600 ${fontSize}px "${styles.fontFamily.replace(/"/g, '')}"`;
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
    const { msg, lines, lineHeightPx, bubbleHeight } = data;
    const isUser = msg.role === 'user';
    const bubbleBg = isUser ? styles.bubbleRightBg : styles.bubbleLeftBg;
    const bubbleColor = isUser ? styles.bubbleRightColor : styles.bubbleLeftColor;

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
    const redPacketWidth = 180;
    // 转账消息的最小宽度
    const transferMinWidth = 180;
    // 语音消息的最小宽度（根据时长）
    const voiceMinWidth = msg.type === 'voice' ? Math.min(200, (msg.voice?.duration || 5) * 20 + 100) : 0;
    // 图片消息的固定宽度（正方形）
    const imageWidth = msg.type === 'image' ? 200 : 0;
    
    let actualMaxLineWidth: number;
    if (msg.type === 'redpacket') {
      actualMaxLineWidth = redPacketWidth;
    } else if (msg.type === 'transfer') {
      // 转账消息使用最小宽度
      actualMaxLineWidth = Math.max(maxLineWidth, transferMinWidth);
    } else if (msg.type === 'voice') {
      // 语音消息使用动态宽度
      actualMaxLineWidth = Math.max(maxLineWidth, voiceMinWidth);
    } else if (msg.type === 'image') {
      // 图片消息使用固定宽度
      actualMaxLineWidth = imageWidth;
    } else {
      actualMaxLineWidth = maxLineWidth;
    }
    
    // DEBUG: 检查计算值
    console.log(`[Canvas] msg: "${msg.content.slice(0, 30)}...", maxLineWidth: ${maxLineWidth}, maxBubbleWidth: ${maxBubbleWidth}, bubblePaddingH: ${bubblePaddingH}`);
    
    const bubbleWidth = Math.min(actualMaxLineWidth + bubblePaddingH * 2, maxBubbleWidth);
    console.log(`[Canvas] bubbleWidth: ${bubbleWidth}`);
    const bubbleX = isUser
      ? avatarX - gap - bubbleWidth
      : avatarX + gap + avatarSize;
    // 气泡从用户名下方开始（y + senderNameHeightPx）
    const bubbleY = y + senderNameHeightPx;

    // ============================================================================
    // 核心修复 3: 添加 clip() 防止文字溢出（仅对普通文字消息）
    // ============================================================================
    const isSpecialMessage = msg.type === 'redpacket' || msg.type === 'transfer';
    ctx.save();
    
    // 只有普通消息才使用 clip，特殊消息不使用
    if (!isSpecialMessage) {
      drawBubble(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, bubbleRadius, bubbleBg);
      ctx.clip();
    }

    // 检查是否为红包消息
    if (msg.type === 'redpacket' && msg.redPacket) {
      // DEBUG: 检查绘制位置
      console.log(`[Canvas] 红包消息绘制位置: bubbleX=${bubbleX}, bubbleY=${bubbleY}, bubbleWidth=${bubbleWidth}, bubbleHeight=${bubbleHeight}`);
      
      // 绘制红包消息（使用样式配置）
      drawBubble(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, bubbleRadius, '#fff');
      const redPacket = msg.redPacket;
      const s: MessageStyleConfig = getRedPacketStyle('wechat'); // 使用消息的平台样式
      
      // 计算各部分高度（按比例）
      const iconSize = s.icon?.size || 48;
      const bodyHeight = bubbleHeight - (s.footer?.height || 32);
      
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
      const iconX = bubbleX + (s.body?.padding || 12);
      const iconY = bubbleY + (bodyHeight - iconSize) / 2;
      ctx.fillStyle = s.icon?.background || '#FFD700';
      ctx.beginPath();
      ctx.arc(iconX + iconSize/2, iconY + iconSize/2, iconSize/2, 0, Math.PI * 2);
      ctx.fill();
      
      // 钱袋图标内文字
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${iconSize * 0.5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🧧', iconX + iconSize/2, iconY + iconSize/2);
      
      // 3. 绘制标题"红包"（白色，加粗）
      const contentX = iconX + iconSize + 12;
      ctx.fillStyle = s.title?.color || '#fff';
      ctx.font = `bold ${s.title?.fontSize || 16}px "${styles.fontFamily.replace(/"/g, '')}"`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('红包', contentX, iconY + 6);
      
      // 4. 绘制祝福语（白色，小字）
      ctx.fillStyle = s.content?.color || 'rgba(255,255,255,0.9)';
      ctx.font = `${s.content?.fontSize || 12}px "${styles.fontFamily.replace(/"/g, '')}"`;
      ctx.fillText(redPacket.greeting, contentX, iconY + (s.title?.fontSize || 16) + 10);
      
      // 5. 绘制底部状态栏（白色背景）
      ctx.fillStyle = s.footer?.background || 'rgba(255,255,255,0.95)';
      ctx.fillRect(bubbleX, bubbleY + bodyHeight, bubbleWidth, s.footer?.height || 32);
      
      // 分割线
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(bubbleX, bubbleY + bodyHeight);
      ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bodyHeight);
      ctx.stroke();
      
      // 状态文字（灰色）
      ctx.fillStyle = s.footer?.color || '#999';
      ctx.font = `${s.footer?.fontSize || 11}px "${styles.fontFamily.replace(/"/g, '')}"`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const statusText = redPacket.isOpened ? `已领取 ¥${(redPacket.amount / 100).toFixed(2)}` : '领取红包';
      ctx.fillText(statusText, bubbleX + bubbleWidth / 2, bubbleY + bodyHeight + (s.footer?.height || 32) / 2);
      
    } else if (msg.type === 'transfer' && msg.transfer) {
      // DEBUG: 检查绘制位置
      console.log(`[Canvas] 转账消息绘制位置: bubbleX=${bubbleX}, bubbleY=${bubbleY}, bubbleWidth=${bubbleWidth}, bubbleHeight=${bubbleHeight}`);
      
      // 绘制转账消息
      const transfer = msg.transfer;
      const s: MessageStyleConfig = getRedPacketStyle('wechat'); // 使用样式配置
      const iconSize = s.icon?.size || 44;
      const bodyHeight = bubbleHeight - (s.footer?.height || 32);
      
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
      const iconX = bubbleX + (s.body?.padding || 12);
      const iconY = bubbleY + (bodyHeight - iconSize) / 2;
      ctx.fillStyle = '#07c160'; // 微信绿
      ctx.beginPath();
      ctx.arc(iconX + iconSize/2, iconY + iconSize/2, iconSize/2, 0, Math.PI * 2);
      ctx.fill();
      
      // 图标内文字 "¥"
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${iconSize * 0.45}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('¥', iconX + iconSize/2, iconY + iconSize/2);
      
      // 3. 绘制标题"转账"（深色）
      const contentX = iconX + iconSize + 12;
      ctx.fillStyle = '#333';
      ctx.font = `bold ${s.title?.fontSize || 16}px "${styles.fontFamily.replace(/"/g, '')}"`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('转账', contentX, iconY + 4);
      
      // 4. 绘制金额（大号深色）
      ctx.fillStyle = '#333';
      ctx.font = `bold ${(s.title?.fontSize || 16) + 2}px "${styles.fontFamily.replace(/"/g, '')}"`;
      ctx.fillText(`¥${(transfer.amount / 100).toFixed(2)}`, contentX, iconY + (s.title?.fontSize || 16) + 10);
      
      // 5. 绘制底部状态栏（白色背景）
      ctx.fillStyle = '#fff';
      ctx.fillRect(bubbleX, bubbleY + bodyHeight, bubbleWidth, s.footer?.height || 32);
      
      // 分割线
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(bubbleX, bubbleY + bodyHeight);
      ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bodyHeight);
      ctx.stroke();
      
      // 状态文字（绿色表示已收款，灰色表示待收款）
      ctx.fillStyle = transfer.isReceived ? '#07c160' : '#999';
      ctx.font = `${s.footer?.fontSize || 11}px "${styles.fontFamily.replace(/"/g, '')}"`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const statusText = transfer.isReceived ? '已收款' : '待收款';
      ctx.fillText(statusText, bubbleX + bubbleWidth / 2, bubbleY + bodyHeight + (s.footer?.height || 32) / 2);
      
    } else if (msg.type === 'voice' && msg.voice) {
      // 绘制语音消息
      const voice = msg.voice;
      const padding = 12;
      const iconSize = 20;
      
      // 绘制播放图标
      const iconX = bubbleX + padding;
      const iconY = bubbleY + (bubbleHeight * 0.5 - iconSize) / 2; // 图标在语音条上半部分居中
      ctx.fillStyle = isUser ? bubbleColor : '#333';
      ctx.beginPath();
      // 播放图标（三角形）
      ctx.moveTo(iconX, iconY);
      ctx.lineTo(iconX, iconY + iconSize);
      ctx.lineTo(iconX + iconSize, iconY + iconSize / 2);
      ctx.closePath();
      ctx.fill();
      
      // 绘制语音波形（只在上半部分）
      const waveX = iconX + iconSize + 8;
      const waveY = bubbleY + padding;
      const waveHeight = bubbleHeight * 0.5 - padding * 2; // 波形高度 = 气泡上半部分 - padding
      const waveCount = 20;
      const barWidth = 3;
      const barGap = 2;
      
      ctx.fillStyle = isUser ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.3)';
      for (let i = 0; i < waveCount; i++) {
        const barHeight = (Math.sin(i * 0.5) * 0.5 + 0.5) * waveHeight * 0.8 + waveHeight * 0.2;
        const barX = waveX + i * (barWidth + barGap);
        const barY = waveY + (waveHeight - barHeight) / 2;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth, barHeight, 1);
        ctx.fill();
      }
      
      // 绘制时长（在语音条上半部分）
      ctx.fillStyle = isUser ? 'rgba(255,255,255,0.8)' : '#999';
      ctx.font = `${12}px "${styles.fontFamily.replace(/"/g, '')}"`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${voice.duration}"'`, bubbleX + bubbleWidth - padding, bubbleY + bubbleHeight * 0.25);
      
      // 绘制文字内容（如果有）- 在气泡下半部分
      if (voice.text) {
        const textPadding = 6;
        const textY = bubbleY + bubbleHeight * 0.5; // 文字在气泡下半部分
        
        // 绘制文字背景
        ctx.fillStyle = isUser ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)';
        ctx.beginPath();
        ctx.moveTo(bubbleX + bubbleRadius, bubbleY + bubbleHeight * 0.5);
        ctx.lineTo(bubbleX + bubbleWidth - bubbleRadius, bubbleY + bubbleHeight * 0.5);
        ctx.arcTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight * 0.5, bubbleX + bubbleWidth, bubbleY + bubbleHeight * 0.5 + bubbleRadius, bubbleRadius);
        ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - bubbleRadius);
        ctx.arcTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - bubbleRadius, bubbleY + bubbleHeight, bubbleRadius);
        ctx.lineTo(bubbleX + bubbleRadius, bubbleY + bubbleHeight);
        ctx.arcTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - bubbleRadius, bubbleRadius);
        ctx.lineTo(bubbleX, bubbleY + bubbleHeight * 0.5 + bubbleRadius);
        ctx.arcTo(bubbleX, bubbleY + bubbleHeight * 0.5, bubbleX + bubbleRadius, bubbleY + bubbleHeight * 0.5, bubbleRadius);
        ctx.closePath();
        ctx.fill();
        
        // 绘制文字
        ctx.fillStyle = isUser ? 'rgba(255,255,255,0.9)' : '#666';
        ctx.font = `${12}px "${styles.fontFamily.replace(/"/g, '')}"`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(voice.text, bubbleX + textPadding, textY + bubbleHeight * 0.25);
      }
    } else if (msg.type === 'image' && msg.image) {
      // 绘制图片消息（正方形）
      const imgPadding = 4;
      const imgSize = bubbleWidth - imgPadding * 2; // 正方形图片大小
      const imgBubbleHeight = imgSize; // 图片气泡高度等于图片大小
      
      // DEBUG: 检查图片消息的尺寸
      console.log(`[Canvas] 图片消息: bubbleWidth=${bubbleWidth}, bubbleHeight=${bubbleHeight}, imgSize=${imgSize}, imgBubbleHeight=${imgBubbleHeight}, url=${msg.image.url ? '有' : '无'}`);
      
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
        try {
          // 创建临时图片对象
          const tempImg = new Image();
          tempImg.src = msg.image.url;
          
          // 如果图片已加载，直接绘制（填满整个正方形区域）
          if (tempImg.complete && tempImg.naturalWidth > 0) {
            ctx.drawImage(tempImg, bubbleX + imgPadding, bubbleY + imgPadding, imgSize, imgSize);
          } else {
            // 图片未加载，显示图片图标
            ctx.fillStyle = '#ccc';
            ctx.beginPath();
            ctx.arc(bubbleX + bubbleWidth / 2, bubbleY + imgBubbleHeight / 2, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(bubbleX + bubbleWidth / 2, bubbleY + imgBubbleHeight / 2, 8, 0, Math.PI * 2);
            ctx.fill();
          }
        } catch {
          // 加载失败，显示占位符
          ctx.fillStyle = '#ccc';
          ctx.beginPath();
          ctx.arc(bubbleX + bubbleWidth / 2, bubbleY + imgBubbleHeight / 2, 12, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // 没有图片URL，显示图片图标
        ctx.fillStyle = '#ccc';
        ctx.beginPath();
        ctx.arc(bubbleX + bubbleWidth / 2, bubbleY + imgBubbleHeight / 2, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(bubbleX + bubbleWidth / 2, bubbleY + imgBubbleHeight / 2, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // 恢复裁剪状态
      ctx.restore();
      
    } else {
      // 绘制普通文字消息
      // Draw text + emoji content
      ctx.fillStyle = bubbleColor;
      ctx.textBaseline = 'middle'; // 改为 'middle'，垂直居中

      // 文字垂直居中
      const totalTextHeight = lines.length * lineHeightPx;
      const startY = bubbleY + (bubbleHeight - totalTextHeight) / 2 + lineHeightPx / 2;

      for (let li = 0; li < lines.length; li++) {
        // 每行的 Y 坐标 = 起始Y + 行高 * 行号
        const lineY = startY + lineHeightPx * li;

        let xOffset = 0;
        for (const frag of lines[li]) {
          if (frag.type === 'emoji') {
            // Draw emoji image - 垂直居中于文字行
            const cachedImg = imgCache.get(frag.emojiUrl!);
            if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
              const emojiY = lineY + (lineHeightPx - emojiSize) / 2; // 垂直居中
              ctx.drawImage(cachedImg, bubbleX + bubblePaddingH + xOffset, emojiY, emojiSize, emojiSize);
            }
            xOffset += emojiSize + 2;
          } else {
            // Draw text
            const textX = bubbleX + bubblePaddingH + xOffset;
            if (isUser) {
              // Right-aligned: draw from right edge, text extends left
              const textWidth = measureTextWidth(ctx, frag.content);
              const rightEdgeX = bubbleX + bubbleWidth - bubblePaddingH;
              ctx.textAlign = 'left';
              ctx.fillText(frag.content, rightEdgeX - textWidth + xOffset, lineY);
              xOffset += textWidth;
            } else {
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
    const contentHeight = senderNameHeightPx + bubbleHeight;
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
