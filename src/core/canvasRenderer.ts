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

function drawQuote(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, quote: Message['quote'], fontSize: number, scale: number, _fontFamily?: string): number {
  if (!quote) return 0;
  const miniScale = 0.6;
  const barW = Math.round(3 * scale);
  const pad = Math.round(6 * scale);
  const contentX = x + barW + pad;
  const contentWidth = w - barW - pad * 2;
  let contentHeight = Math.round(32 * miniScale * scale);

  if (quote.type === 'file' && quote.file) {
    contentHeight = Math.round(48 * miniScale * scale);
    drawMiniFileQuote(ctx, contentX, y, contentWidth, contentHeight, quote.file, miniScale * scale);
  } else if (quote.type === 'image' && quote.image) {
    contentHeight = Math.round(120 * miniScale * scale);
    drawMiniImageQuote(ctx, contentX, y, contentWidth, contentHeight, quote.image, miniScale * scale);
  } else {
    const innerPad = Math.round(8 * miniScale * scale);
    const maxW = contentWidth - innerPad * 2;
    const emojiSize2 = Math.round(fontSize * miniScale * 1.2);
    // 必须先设置字体，否则 measureTextWidth 用的是默认字体（不是 Microsoft YaHei）
    ctx.font = `${Math.round(fontSize * miniScale * 0.9)}px "Microsoft YaHei", sans-serif`;
    const fragments = parseFragments(quote.content || '');
    const allLines = wrapTextFragments(ctx, fragments, maxW, emojiSize2);
    const displayLines = allLines.slice(0, 2);
    const lineH = Math.round(fontSize * miniScale * 1.2);
    contentHeight = Math.max(
      contentHeight,
      innerPad + lineH + displayLines.length * lineH + innerPad,
    );

    drawBubble(ctx, contentX, y, contentWidth, contentHeight, Math.round(8 * miniScale * scale), 'rgba(0,0,0,0.05)');
    const textX = contentX + innerPad;
    const textY = y + innerPad;

    ctx.fillStyle = '#111';
    ctx.font = `bold ${Math.round(fontSize * miniScale * 0.9)}px "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(quote.sender, textX, textY);

    ctx.fillStyle = '#666';
    ctx.font = `${Math.round(fontSize * miniScale * 0.9)}px "Microsoft YaHei", sans-serif`;

    const contentY = textY + lineH;
    for (let i = 0; i < displayLines.length; i++) {
      const line = displayLines[i];
      const lineY = contentY + i * lineH;
      let xOffset = 0;
      for (const frag of line) {
        if (frag.type === 'emoji') {
          ctx.font = `${lineH}px sans-serif`;
          ctx.fillText(frag.emojiUnicode || frag.content, textX + xOffset, lineY);
          xOffset += lineH + 2;
        } else {
          ctx.fillText(frag.content, textX + xOffset, lineY);
          xOffset += measureTextWidth(ctx, frag.content);
        }
      }
    }
  }

  ctx.fillStyle = '#C9C9C9';
  ctx.fillRect(x, y, barW, contentHeight);
  return contentHeight + Math.round(4 * scale);
}

function getQuoteBlockHeight(
  ctx: CanvasRenderingContext2D,
  quote: Message['quote'],
  availableWidth: number,
  fontSize: number,
  scale: number,
): number {
  const miniScale = 0.6;
  if (!quote) return 0;

  const barW = Math.round(3 * scale);
  const pad = Math.round(6 * scale);
  const contentWidth = availableWidth - barW - pad * 2;

  if (quote.type === 'file' && quote.file) {
    return Math.round(48 * miniScale * scale) + Math.round(4 * scale);
  }
  if (quote.type === 'image' && quote.image) {
    return Math.round(120 * miniScale * scale) + Math.round(4 * scale);
  }

  const innerPad = Math.round(8 * miniScale * scale);
  // maxW 是 quote 文本的实际可用宽度 = contentWidth - innerPad*2（和 drawQuote 保持一致）
  const maxW = contentWidth - innerPad * 2;
  const emojiSize = Math.round(fontSize * miniScale * 1.2);
  const fragments = parseFragments(quote.content || '');
  const lines = wrapTextFragments(ctx, fragments, maxW, emojiSize);
  const visibleLines = Math.min(lines.length, 2);
  const lineH = Math.round(fontSize * miniScale * 1.2);

  return innerPad + lineH + visibleLines * lineH + innerPad + Math.round(4 * scale);
}

// ============================================================================
// 核心修复 1: 符合 Unicode Line Break Algorithm 的智能换行
// 参考 CSS word-break: break-word 行为
// ============================================================================
interface TextFragment {
  type: 'text' | 'emoji';
  content: string;
  emojiUnicode?: string;
}

function parseFragments(content: string): TextFragment[] {
  const fragments: TextFragment[] = [];
  const emojiPattern = /(\[[^\]]{1,10}\])/g;
  let lastIndex = 0;
  let match;

  while ((match = emojiPattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index);
      if (text) fragments.push({ type: 'text', content: text });
    }

    const emoji = EMOJI_MAP.get(match[0]);
    if (emoji && emoji.unicode) {
      fragments.push({ type: 'emoji', content: match[0], emojiUnicode: emoji.unicode });
    } else {
      fragments.push({ type: 'text', content: match[0] });
    }

    lastIndex = match.index + match[0].length;
  }

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
      for (const char of text) {
        const charWidth = measureTextWidth(ctx, char);
        if (currentLineWidth + charWidth > maxWidth && currentLine.length > 0) {
          lines.push(currentLine);
          currentLine = [];
          currentLineWidth = 0;
        }
        currentLine.push({ type: 'text', content: char });
        currentLineWidth += charWidth;
      }
    } else {
      // 英文文本：按单词换行（单词不拆分）
      const words = text.split(' ');
      for (let wi = 0; wi < words.length; wi++) {
        const word = words[wi];
        // 非最后一个单词后面要加空格
        const wordDisplay = wi < words.length - 1 ? word + ' ' : word;
        const wordWidth = measureTextWidth(ctx, wordDisplay);

        if (currentLineWidth + wordWidth > maxWidth && currentLine.length > 0) {
          lines.push(currentLine);
          currentLine = [];
          currentLineWidth = 0;
        }
        currentLine.push({ type: 'text', content: wordDisplay });
        currentLineWidth += wordWidth;
      }
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [[]];
}

export function calculateVoiceBubbleHeight(
  ctx: CanvasRenderingContext2D,
  voiceText: string,
  bubbleWidth: number,
  bubblePaddingH: number,
  emojiSize: number,
  lineHeightPx: number,
  voiceBubbleHeight: number,
  voiceTextPadding: number,
): number {
  const textFragments = parseFragments(voiceText);
  const textLines = wrapTextFragments(ctx, textFragments, bubbleWidth - bubblePaddingH * 2, emojiSize);
  const textHeight = textLines.length * lineHeightPx;
  return voiceBubbleHeight + textHeight + voiceTextPadding * 2;
}

export interface RenderOptions {
  width: number;
  height: number;
  styles: ThemeStyles;
  title: string;
  messages: Message[];
  users: UserProfile[];
  scale?: number;
  /** 预加载好的消息图片缓存（由调用方异步预加载后传入）*/
  imageCache?: Map<string, HTMLImageElement>;
  /** 深色模式 */
  darkMode?: boolean;
}

export function renderChatToCanvas(canvas: HTMLCanvasElement, options: RenderOptions): void {
  const { width, height, styles, title, messages, users, imageCache, darkMode = false, scale: customScale } = options;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

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
  const redPacketHeight = Math.round(100 * scale);
  const redPacketWidth = Math.round(200 * scale);
  const transferHeight = Math.round(100 * scale);
  const transferWidth = Math.round(200 * scale);
  const voiceBubbleHeight = Math.round(40 * scale);
  const imageBubbleHeight = Math.round(200 * scale);
  const imageWidth = Math.round(200 * scale);
  
  // 行高在循环外计算一次
  const lineHeightPx = fontSize * lineHeightRatio;
  const voiceTextFontSize = Math.round(fontSize * 0.9);
  const voiceTextLineHeightPx = Math.round(voiceTextFontSize * 1.5);
  const voiceTextPadding = Math.round(4 * scale);
  
const messageData = messages.map(msg => {
    let bubbleWidth: number;
    let bubbleHeight: number;
    let fragments: TextFragment[] = [];
    let textHeight = 0;
    let quoteBlockHeight = 0;

    if (msg.type === 'redpacket') {
      bubbleWidth = redPacketWidth;
      const textContentWidth = bubbleWidth - bubblePaddingH * 2;
      quoteBlockHeight = msg.quote ? getQuoteBlockHeight(ctx, msg.quote, textContentWidth, fontSize, scale) : 0;
      bubbleHeight = redPacketHeight + quoteBlockHeight;
    } else if (msg.type === 'transfer') {
      bubbleWidth = transferWidth;
      const textContentWidth = bubbleWidth - bubblePaddingH * 2;
      quoteBlockHeight = msg.quote ? getQuoteBlockHeight(ctx, msg.quote, textContentWidth, fontSize, scale) : 0;
      bubbleHeight = transferHeight + quoteBlockHeight;
    } else if (msg.type === 'voice' && msg.voice) {
      const iconArea = Math.round(16 * scale);
      const durationArea = Math.round(40 * scale);
      const waveformArea = Math.max(Math.round(60 * scale), Math.round((msg.voice.duration || 5) * 8 * scale));
      const voiceControlWidth = bubblePaddingH + iconArea + bubblePaddingH + waveformArea + durationArea + bubblePaddingH;
      bubbleWidth = Math.min(voiceControlWidth, maxBubbleWidth);

      if (msg.voice.text) {
        const voiceTextFragments = parseFragments(msg.voice.text);
        const baseWidth = bubbleWidth - bubblePaddingH * 2;
        const voiceTextLinesPreview = wrapTextFragments(ctx, voiceTextFragments, baseWidth, emojiSize);
        let textRequiredWidth = maxBubbleWidth;
        if (voiceTextLinesPreview.length === 1) {
          let measured = 0;
          for (const frag of voiceTextFragments) {
            if (frag.type === 'emoji') measured += emojiSize + 2;
            else measured += measureTextWidth(ctx, frag.content);
          }
          textRequiredWidth = Math.min(measured + bubblePaddingH * 2, maxBubbleWidth);
        }
        bubbleWidth = Math.min(Math.max(voiceControlWidth, textRequiredWidth), maxBubbleWidth);
        const actualTextContentWidth = bubbleWidth - bubblePaddingH * 2;
        const wrappedTextLines = wrapTextFragments(ctx, voiceTextFragments, actualTextContentWidth, emojiSize);
        textHeight = wrappedTextLines.length * voiceTextLineHeightPx;
        quoteBlockHeight = msg.quote ? getQuoteBlockHeight(ctx, msg.quote, actualTextContentWidth, fontSize, scale) : 0;
        bubbleHeight = voiceBubbleHeight + textHeight + voiceTextPadding * 2 + quoteBlockHeight;
      } else {
        bubbleWidth = Math.min(voiceControlWidth, maxBubbleWidth);
        quoteBlockHeight = msg.quote ? getQuoteBlockHeight(ctx, msg.quote, bubbleWidth - bubblePaddingH * 2, fontSize, scale) : 0;
        bubbleHeight = voiceBubbleHeight + quoteBlockHeight;
      }
    } else if (msg.type === 'image') {
      bubbleWidth = imageWidth;
      quoteBlockHeight = msg.quote ? getQuoteBlockHeight(ctx, msg.quote, bubbleWidth - bubblePaddingH * 2, fontSize, scale) : 0;
      bubbleHeight = imageBubbleHeight + quoteBlockHeight;
    } else if (msg.type === 'file') {
      bubbleWidth = Math.round(220 * scale);
      fragments = parseFragments(msg.content || '');
      const textContentWidth = bubbleWidth - bubblePaddingH * 2;
      textHeight = textContentWidth > 0 ? 1 : 0; // 文件消息标题固定单行显示
      quoteBlockHeight = msg.quote ? getQuoteBlockHeight(ctx, msg.quote, textContentWidth, fontSize, scale) : 0;
      bubbleHeight = Math.round(64 * scale) + quoteBlockHeight;
    } else {
      // 文字消息：先用 maxBubbleWidth 估算最大行宽，确定气泡宽度
      fragments = parseFragments(msg.content || '');
      const previewLines = wrapTextFragments(ctx, fragments, maxBubbleWidth - bubblePaddingH * 2, emojiSize);
      let previewMaxLineWidth = 0;
      for (const line of previewLines) {
        let w = 0;
        for (const frag of line) {
          if (frag.type === 'emoji') w += emojiSize + 2;
          else w += measureTextWidth(ctx, frag.content);
        }
        if (w > previewMaxLineWidth) previewMaxLineWidth = w;
      }
      bubbleWidth = Math.min(previewMaxLineWidth + bubblePaddingH * 2, maxBubbleWidth);

      const textContentWidth = bubbleWidth - bubblePaddingH * 2;
      quoteBlockHeight = msg.quote ? getQuoteBlockHeight(ctx, msg.quote, textContentWidth, fontSize, scale) : 0;
      // 气泡高度用估算值（maxBubbleWidth 换行的行数），渲染阶段会重新换行
      textHeight = previewLines.length * lineHeightPx;
      bubbleHeight = textHeight + bubblePaddingV * 2 + quoteBlockHeight;
    }

    return { msg, fragments, bubbleWidth, bubbleHeight };
  });

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
    const { msg } = data;
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
    const avatarUrl = userAvatarMap.get(msg.sender);
    const cachedAvatar = avatarUrl ? msgImageCache.get(`avatar:${msg.sender}`) : undefined;
    drawAvatar(ctx, avatarX, avatarY, avatarSize, msg.sender, cachedAvatar?.src || avatarUrl, msgImageCache);

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
    
    // Bubble dimensions - 使用 messageData 中的计算结果
    const bubbleWidth = data.bubbleWidth;
    const bubbleX = isUser
      ? avatarX - gap - bubbleWidth
      : avatarX + gap + avatarSize;
    const bubbleY = y + senderNameHeightPx;
    const bubbleHeight = data.bubbleHeight;
    
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
      // 绘制红包消息（使用样式配置）
      drawBubble(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, bubbleRadius, '#fff');
      const redPacket = msg.redPacket;
      
      // 计算各部分高度（按比例缩放）
      const iconSize = Math.round(42 * scale);
      const bodyPaddingH = Math.round(12 * scale);
      const footerHeight = Math.round(22 * scale);
      const bodyHeight = bubbleHeight - footerHeight;
      const titleFontSize = Math.round(15 * scale);
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
      const iconX = bubbleX + bodyPaddingH;
      const iconY = bubbleY + (bodyHeight - iconSize) / 2;
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(iconX + iconSize/2, iconY + iconSize/2, iconSize/2, 0, Math.PI * 2);
      ctx.fill();

      // 钱袋图标内文字
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.round(iconSize * 0.5)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🧧', iconX + iconSize/2, iconY + iconSize/2);

      // 3. 绘制标题"微信红包"（白色，加粗）
      const contentX = iconX + iconSize + Math.round(10 * scale);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${titleFontSize}px "${styles.fontFamily.replace(/"/g, '')}"`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('微信红包', contentX, iconY + Math.round(2 * scale));

      // 4. 绘制祝福语（白色，小字）
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `${contentFontSize}px "${styles.fontFamily.replace(/"/g, '')}"`;
      ctx.fillText(redPacket.greeting || '恭喜发财，大吉大利', contentX, iconY + titleFontSize + Math.round(3 * scale));
      
      // 4. 绘制祝福语（白色，小字）
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `${contentFontSize}px "${styles.fontFamily.replace(/"/g, '')}"`;
      ctx.fillText(redPacket.greeting, contentX, iconY + titleFontSize + Math.round(3 * scale));
      
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
      const iconSize = Math.round(42 * scale);
      const bodyPaddingH = Math.round(12 * scale);
      const footerHeight = Math.round(22 * scale);
      const bodyHeight = bubbleHeight - footerHeight;
      const titleFontSize = Math.round(14 * scale);
      const amountFontSize = Math.round(20 * scale);
      const footerFontSize = Math.round(11 * scale);

      // 1. 绘制主体区域（浅绿色背景）
      ctx.fillStyle = '#e8f5e9';
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
      const iconX = bubbleX + bodyPaddingH;
      const iconY = bubbleY + (bodyHeight - iconSize) / 2;
      ctx.fillStyle = '#07c160';
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
      const contentX = iconX + iconSize + Math.round(10 * scale);
      ctx.fillStyle = '#333';
      ctx.font = `${titleFontSize}px "${styles.fontFamily.replace(/"/g, '')}"`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('转账', contentX, iconY);

      // 4. 绘制金额（大号深色）
      ctx.fillStyle = '#333';
      ctx.font = `bold ${amountFontSize}px "${styles.fontFamily.replace(/"/g, '')}"`;
      ctx.fillText(`¥${(transfer.amount / 100).toFixed(2)}`, contentX, iconY + titleFontSize + Math.round(2 * scale));
      
      // 5. 绘制底部状态栏（白色背景）
      ctx.fillStyle = '#fff';
      ctx.fillRect(bubbleX, bubbleY + bodyHeight, bubbleWidth, footerHeight);
      
      // 分割线
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
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
      const statusText = transfer.isReceived ? '已收款' : '请确认收款';
      ctx.fillText(statusText, bubbleX + bubbleWidth / 2, bubbleY + bodyHeight + footerHeight / 2);
      
    } else if (msg.type === 'voice' && msg.voice) {
      const voice = msg.voice;
      const iconSize = Math.round(16 * scale);
      const waveHeight = Math.round(24 * scale);
      const barWidth = Math.max(1, Math.round(3 * scale));
      const barGap = Math.max(1, Math.round(2 * scale));
      const waveAreaHeight = voiceBubbleHeight;
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
      
      // 绘制气泡背景
      drawBubble(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, bubbleRadius, bubbleBg);
      
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
        ctx.textBaseline = 'top';
        ctx.font = `${voiceTextFontSize}px "${styles.fontFamily.replace(/"/g, '')}"`;
        
        const textContentWidth = bubbleWidth - bubblePaddingH * 2;
        const textTopPadding = voiceTextPadding;
        
        const textFragments = parseFragments(voice.text);
        const textLines = wrapTextFragments(ctx, textFragments, textContentWidth, emojiSize);
        const startY = bubbleY + waveAreaHeight + textTopPadding;
        
        for (let li = 0; li < textLines.length; li++) {
          const lineY = startY + voiceTextLineHeightPx * li;
          let xOffset = 0;
          
          for (const frag of textLines[li]) {
            if (frag.type === 'emoji') {
              if (frag.emojiUnicode) {
                ctx.font = `${emojiSize}px sans-serif`;
                ctx.textAlign = 'left';
                ctx.fillText(frag.emojiUnicode, bubbleX + bubblePaddingH + xOffset, lineY);
                xOffset += emojiSize + 2;
                ctx.font = `${voiceTextFontSize}px "${styles.fontFamily.replace(/"/g, '')}"`;
              }
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
        const cachedImg = msgImageCache.get(msg.image.url);
        if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
          ctx.drawImage(cachedImg, bubbleX + imgPadding, bubbleY + imgPadding, imgSize, imgSize);
        } else {
          // 图片未加载或不可用，显示图片图标
          ctx.fillStyle = '#ccc';
          ctx.beginPath();
          ctx.arc(bubbleX + bubbleWidth / 2, bubbleY + imgBubbleHeight / 2, iconOuterRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(bubbleX + bubbleWidth / 2, bubbleY + imgBubbleHeight / 2, iconInnerRadius, 0, Math.PI * 2);
          ctx.fill();
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

    } else if (msg.type === 'file' && msg.file) {
      // 绘制文件消息
      ctx.restore(); // 先恢复 clip
      ctx.save();
      
      // 先绘制引用块
      let quoteOffsetY = 0;
      if (msg.quote) {
        quoteOffsetY = drawQuote(ctx, bubbleX + bubblePaddingH, bubbleY + bubblePaddingV, bubbleWidth - bubblePaddingH * 2, msg.quote, fontSize, scale, styles.fontFamily);
      }
      
      const fileH = Math.round(64 * scale);
      const fileR = Math.round(10 * scale);
      ctx.beginPath();
      ctx.moveTo(bubbleX + fileR, bubbleY + quoteOffsetY); ctx.lineTo(bubbleX + bubbleWidth - fileR, bubbleY + quoteOffsetY);
      ctx.arcTo(bubbleX + bubbleWidth, bubbleY + quoteOffsetY, bubbleX + bubbleWidth, bubbleY + quoteOffsetY + fileR, fileR);
      ctx.lineTo(bubbleX + bubbleWidth, bubbleY + quoteOffsetY + fileH - fileR);
      ctx.arcTo(bubbleX + bubbleWidth, bubbleY + quoteOffsetY + fileH, bubbleX + bubbleWidth - fileR, bubbleY + quoteOffsetY + fileH, fileR);
      ctx.lineTo(bubbleX + fileR, bubbleY + quoteOffsetY + fileH);
      ctx.arcTo(bubbleX, bubbleY + quoteOffsetY + fileH, bubbleX, bubbleY + quoteOffsetY + fileH - fileR, fileR);
      ctx.lineTo(bubbleX, bubbleY + quoteOffsetY + fileR);
      ctx.arcTo(bubbleX, bubbleY + quoteOffsetY, bubbleX + fileR, bubbleY + quoteOffsetY, fileR);
      ctx.closePath();
      ctx.fillStyle = '#FFFFFF'; ctx.fill();
      ctx.strokeStyle = '#E0E0E0'; ctx.lineWidth = 1; ctx.stroke();

      const iconSize = Math.round(36 * scale);
      const iconX = bubbleX + bubblePaddingH;
      const iconY = bubbleY + quoteOffsetY + (fileH - iconSize) / 2;
      const ext = (msg.file.type || '').toUpperCase();
      const iconColor = ext === 'PDF' ? '#E53935' : ext === 'DOCX' || ext === 'DOC' ? '#1565C0' : ext === 'XLSX' || ext === 'XLS' ? '#2E7D32' : '#757575';
      ctx.fillStyle = iconColor;
      ctx.beginPath(); ctx.roundRect(iconX, iconY, iconSize, iconSize, Math.round(4 * scale)); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.round(9 * scale)}px "${styles.fontFamily.replace(/"/g, '')}"`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(ext.slice(0, 4), iconX + iconSize / 2, iconY + iconSize / 2);

      const textX = iconX + iconSize + Math.round(10 * scale);
      const maxTextW = bubbleWidth - (textX - bubbleX) - bubblePaddingH;
      ctx.fillStyle = '#1A1A1A';
      ctx.font = `${Math.round(13 * scale)}px "${styles.fontFamily.replace(/"/g, '')}"`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      let fname = msg.file.name;
      while (fname.length > 1 && ctx.measureText(fname).width > maxTextW) fname = fname.slice(0, -1);
      ctx.fillText(fname, textX, iconY + Math.round(4 * scale));
      ctx.fillStyle = '#888';
      ctx.font = `${Math.round(11 * scale)}px "${styles.fontFamily.replace(/"/g, '')}"`;
      ctx.fillText(msg.file.size, textX, iconY + Math.round(13 * scale) + Math.round(8 * scale));

    } else {
      // 绘制引用块
      const actualQuoteHeight = msg.quote
        ? drawQuote(
            ctx,
            bubbleX + bubblePaddingH,
            bubbleY + bubblePaddingV,
            bubbleWidth - bubblePaddingH * 2,
            msg.quote,
            fontSize,
            scale,
            styles.fontFamily
          )
        : 0;

      // 绘制文字内容（紧接在引用块下方，不是在气泡内居中）
      ctx.fillStyle = bubbleColor;
      ctx.textBaseline = 'middle';
      ctx.font = `${fontSize}px "${styles.fontFamily.replace(/"/g, '')}"`;

      const textContentWidth = bubbleWidth - bubblePaddingH * 2;
      const textFragments = parseFragments(msg.content || '');
      const textLines = wrapTextFragments(ctx, textFragments, textContentWidth, emojiSize);

      const totalTextHeight = textLines.length * lineHeightPx;
      let startY: number;
      if (actualQuoteHeight > 0) {
        // 有引用：文字在引用块下方的剩余空间内垂直居中
        const textStartY = bubbleY + bubblePaddingV + actualQuoteHeight;
        const remainingHeight = bubbleHeight - actualQuoteHeight;
        startY = textStartY + (remainingHeight - totalTextHeight) / 2 + lineHeightPx / 2;
      } else {
        // 无引用：文字在整个气泡内垂直居中（与原始逻辑一致）
        startY = bubbleY + (bubbleHeight - totalTextHeight) / 2 + lineHeightPx / 2;
      }

      for (let li = 0; li < textLines.length; li++) {
        const lineY = startY + lineHeightPx * li;
        let xOffset = 0;

        for (const frag of textLines[li]) {
          if (frag.type === 'emoji') {
            if (frag.emojiUnicode) {
              ctx.font = `${emojiSize}px sans-serif`;
              ctx.textAlign = 'left';
              ctx.textBaseline = 'middle';
              ctx.fillText(frag.emojiUnicode, bubbleX + bubblePaddingH + xOffset, lineY);
              xOffset += emojiSize + 2;
            }
          } else {
            const textX = bubbleX + bubblePaddingH + xOffset;
            ctx.textAlign = 'left';
            ctx.fillText(frag.content, textX, lineY);
            xOffset += measureTextWidth(ctx, frag.content);
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
  name: string,
  avatarUrl?: string,
  imageCache?: Map<string, HTMLImageElement>
): void {
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const radius = size / 2;

  // 优先从 imageCache 中获取已预加载的头像
  if (avatarUrl && imageCache) {
    const cachedImg = imageCache.get(`avatar:${name}`);
    if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(cachedImg, x, y, size, size);
      ctx.restore();
      return;
    }
  }

  // 如果有自定义头像 URL，尝试加载并绘制
  if (avatarUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = avatarUrl;
    if (img.complete && img.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, x, y, size, size);
      ctx.restore();
      return;
    }
  }

  // 使用默认彩色圆形头像
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

function drawMiniFileQuote(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  file: Message['file'],
  scale: number,
): void {
  // 绘制文件背景
  drawBubble(ctx, x, y, w, h, Math.round(8 * scale), '#FFFFFF');
  ctx.strokeStyle = '#E0E0E0';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  const pad = Math.round(6 * scale);
  const iconSize = Math.round(24 * scale);
  const iconX = x + pad;
  const iconY = y + (h - iconSize) / 2;
  const ext = (file?.type || '').toUpperCase();
  const iconColor = ext === 'PDF' ? '#E53935' : ext === 'DOCX' || ext === 'DOC' ? '#1565C0' : ext === 'XLSX' || ext === 'XLS' ? '#2E7D32' : '#757575';
  ctx.fillStyle = iconColor;
  ctx.beginPath();
  ctx.roundRect(iconX, iconY, iconSize, iconSize, Math.round(3 * scale));
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(6 * scale)}px "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ext.slice(0, 4), iconX + iconSize / 2, iconY + iconSize / 2);

  const textX = iconX + iconSize + Math.round(6 * scale);
  const maxTextW = w - (textX - x) - pad;
  let fileName = file?.name || '文件';
  ctx.fillStyle = '#1A1A1A';
  ctx.font = `${Math.round(9 * scale)}px "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  while (fileName.length > 1 && ctx.measureText(fileName).width > maxTextW) fileName = fileName.slice(0, -1);
  ctx.fillText(fileName, textX, iconY + Math.round(2 * scale));

  ctx.fillStyle = '#888';
  ctx.font = `${Math.round(7 * scale)}px "Microsoft YaHei", sans-serif`;
  ctx.fillText(file?.size || '', textX, iconY + Math.round(12 * scale));
}

function drawMiniImageQuote(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  image: Message['image'],
  scale: number,
): void {
  const radius = Math.round(12 * scale);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.clip();
  ctx.fillStyle = '#e0e0e0';
  ctx.fillRect(x, y, w, h);

  if (image?.url) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = image.url;
    if (img.complete && img.naturalWidth > 0) {
      const imgScale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
      const drawW = img.naturalWidth * imgScale;
      const drawH = img.naturalHeight * imgScale;
      ctx.drawImage(img, x + (w - drawW) / 2, y + (h - drawH) / 2, drawW, drawH);
    }
  }

  ctx.restore();
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


