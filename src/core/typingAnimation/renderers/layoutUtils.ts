import type { Message } from '@/types';

export interface MessageLayout {
  msg: Message;
  y: number;
  rowHeight: number;
  bubbleX: number;
  bubbleY: number;
  bubbleWidth: number;
  bubbleHeight: number;
  avatarX: number;
  senderNameX: number;
  isUser: boolean;
  visibleContent: string;
  isTyping: boolean;
  isCurrentTyping: boolean;
}

export interface LayoutConfig {
  width: number;
  height: number;
  headerHeight: number;
  statusBarHeight: number;
  avatarSize: number;
  fontSize: number;
  bubblePadding: number;
  bubbleRadius: number;
  gap: number;
  contentPadding: number;
  maxBubbleWidthRatio: number;
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  width: 375,
  height: 667,
  headerHeight: 48,
  statusBarHeight: 0,
  avatarSize: 40,
  fontSize: 16,
  bubblePadding: 12,
  bubbleRadius: 18,
  gap: 10,
  contentPadding: 10,
  maxBubbleWidthRatio: 0.65,
};

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

export function calculateTextLayout(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number,
  bubblePadding: number
): { width: number; height: number; lines: string[] } {
  ctx.font = `${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
  const textContentWidth = maxWidth - bubblePadding * 2;
  const lines = wrapText(ctx, text, textContentWidth);
  
  let maxLineWidth = 0;
  for (const line of lines) {
    maxLineWidth = Math.max(maxLineWidth, ctx.measureText(line).width);
  }
  
  const bubbleWidth = Math.max(maxLineWidth + bubblePadding * 2, 60);
  const textHeight = lines.length * Math.round(fontSize * 1.4);
  const bubbleHeight = textHeight + bubblePadding * 2;
  
  return { width: bubbleWidth, height: bubbleHeight, lines };
}

export function calculateMessageHeight(
  ctx: CanvasRenderingContext2D,
  msg: Message,
  config: LayoutConfig,
  visibleContent?: string,
  _typingState?: { isTyping: boolean },
  scale: number = 1
): { rowHeight: number; bubbleWidth: number; bubbleHeight: number } {
  const { avatarSize, fontSize, bubblePadding, maxBubbleWidthRatio } = config;
  const senderHeight = Math.round(avatarSize * 0.33);
  const maxBubbleWidth = config.width * maxBubbleWidthRatio;
  
  let rowHeight = avatarSize;
  let bubbleWidth = Math.round(60 * scale);
  let bubbleHeight = Math.round(40 * scale);
  
  // 使用当前可见内容计算布局
  const content = visibleContent || msg.content || '';
  
  switch (msg.type) {
    case 'system':
      return { rowHeight: Math.round(28 * scale), bubbleWidth: 0, bubbleHeight: 0 };

    case 'timestamp':
      return { rowHeight: Math.round(28 * scale), bubbleWidth: 0, bubbleHeight: 0 };

    case 'redpacket':
      const rpQuoteHeight = msg.quote ? Math.round(fontSize * 0.75) * 2 + Math.round(30 * scale) : 0;
      bubbleWidth = Math.round(200 * scale);
      bubbleHeight = Math.round(80 * scale) + rpQuoteHeight;
      rowHeight = Math.max(avatarSize, senderHeight + bubbleHeight);
      return { rowHeight, bubbleWidth, bubbleHeight };

    case 'transfer':
      const trQuoteHeight = msg.quote ? Math.round(fontSize * 0.75) * 2 + Math.round(30 * scale) : 0;
      bubbleWidth = Math.round(200 * scale);
      bubbleHeight = Math.round(80 * scale) + trQuoteHeight;
      rowHeight = Math.max(avatarSize, senderHeight + bubbleHeight);
      return { rowHeight, bubbleWidth, bubbleHeight };

    case 'image':
      const imgQuoteHeight = msg.quote ? Math.round(fontSize * 0.75) * 2 + Math.round(30 * scale) : 0;
      bubbleWidth = Math.round(180 * scale);
      bubbleHeight = Math.round(180 * scale) + imgQuoteHeight;
      rowHeight = Math.max(avatarSize, senderHeight + bubbleHeight);
      return { rowHeight, bubbleWidth, bubbleHeight };

    case 'file':
      const fileQuoteHeight = msg.quote ? Math.round(fontSize * 0.75) * 2 + Math.round(30 * scale) : 0;
      bubbleWidth = Math.round(220 * scale);
      bubbleHeight = Math.round(64 * scale) + fileQuoteHeight;
      rowHeight = Math.max(avatarSize, senderHeight + bubbleHeight);
      return { rowHeight, bubbleWidth, bubbleHeight };
      
    case 'voice': {
      const quoteHeight = msg.quote ? Math.round(fontSize * 0.75) * 2 + Math.round(30 * scale) : 0;
      if (msg.voice?.text) {
        const textLayout = calculateTextLayout(ctx, msg.voice.text, maxBubbleWidth, fontSize, bubblePadding);
        bubbleWidth = Math.min(textLayout.width, maxBubbleWidth);
        bubbleHeight = Math.round(40 * scale) + textLayout.height + quoteHeight;
      } else {
        const waveformArea = Math.max(Math.round(60 * scale), Math.round((msg.voice?.duration || 5) * 8 * scale));
        bubbleWidth = Math.max(Math.round(120 * scale), Math.round(44 * scale + waveformArea));
        bubbleHeight = waveformArea + quoteHeight;
      }
      rowHeight = Math.max(avatarSize, senderHeight + bubbleHeight);
      return { rowHeight, bubbleWidth, bubbleHeight };
    }
      
    default: {
      const quoteHeight = msg.quote ? Math.round(fontSize * 0.75) * 2 + Math.round(30 * scale) : 0;
      const textLayout = calculateTextLayout(ctx, content, maxBubbleWidth, fontSize, bubblePadding);
      bubbleWidth = Math.min(textLayout.width, maxBubbleWidth);
      bubbleHeight = Math.max(textLayout.height, Math.round(40 * scale)) + quoteHeight;
      rowHeight = Math.max(avatarSize, senderHeight + bubbleHeight);
      return { rowHeight, bubbleWidth, bubbleHeight };
    }
  }
}

export function calculateAllLayouts(
  ctx: CanvasRenderingContext2D,
  messages: Message[],
  config: LayoutConfig,
  messageTypingProgress?: Map<string, { text: string; isTyping: boolean }>,
  currentTypingIndex?: number,
  scale: number = 1
): { layouts: MessageLayout[]; totalHeight: number } {
  const { width, headerHeight, statusBarHeight, avatarSize, gap, contentPadding } = config;
  const senderHeight = Math.round(avatarSize * 0.33);
  
  const layouts: MessageLayout[] = [];
  let y = headerHeight + statusBarHeight + contentPadding;
  let totalHeight = 0;
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const isUser = msg.role === 'user';
    
    const avatarX = isUser ? width - contentPadding - avatarSize : contentPadding;
    
    const typingState = messageTypingProgress?.get(msg.id);
    const visibleContent = typingState?.text ?? msg.content ?? '';
    
    const { rowHeight, bubbleWidth, bubbleHeight } = calculateMessageHeight(
      ctx, msg, config, visibleContent, typingState, scale
    );
    
    const actualBubbleX = isUser 
      ? avatarX - gap - bubbleWidth 
      : avatarX + avatarSize + gap;
    
    const senderNameX = isUser ? avatarX - gap : avatarX + avatarSize + gap;
    
    layouts.push({
      msg,
      y,
      rowHeight,
      bubbleX: actualBubbleX,
      bubbleY: y + senderHeight,
      bubbleWidth,
      bubbleHeight,
      avatarX,
      senderNameX,
      isUser,
      visibleContent,
      isTyping: typingState?.isTyping || false,
      isCurrentTyping: i === currentTypingIndex,
    });
    
    y += rowHeight;
    totalHeight += rowHeight;
    if (i < messages.length - 1) {
      y += gap;
      totalHeight += gap;
    }
  }
  
  return { layouts, totalHeight };
}

export function calculateScrollOffset(
  layouts: MessageLayout[],
  _totalHeight: number,
  config: LayoutConfig,
  includeSystemMessages: boolean = true
): number {
  const { headerHeight, statusBarHeight, contentPadding, height } = config;
  const visibleContentHeight = height - headerHeight - statusBarHeight - contentPadding * 2;
  
  const contentOnlyHeight = layouts.reduce((sum, layout) => {
    if (layout.msg.type === 'system' && !includeSystemMessages) return sum;
    return sum + layout.rowHeight + config.gap;
  }, 0);
  
  if (contentOnlyHeight <= visibleContentHeight) {
    return 0;
  }
  
  return contentOnlyHeight - visibleContentHeight;
}

export function isLayoutVisible(
  layout: MessageLayout,
  scrollOffset: number,
  config: LayoutConfig
): boolean {
  const { headerHeight, statusBarHeight, height } = config;
  const visibleTop = headerHeight + statusBarHeight - 20;
  const visibleBottom = height + 20;
  
  const adjustedY = layout.y - scrollOffset;
  
  return adjustedY + layout.rowHeight > visibleTop && adjustedY < visibleBottom;
}
