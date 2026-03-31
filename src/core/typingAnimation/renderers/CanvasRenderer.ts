import type { Message, UserProfile } from '@/types';
import type { 
  TypingAnimationConfig, 
  MessageTypingSequence, 
  ExportConfig,
  TypingRenderContext 
} from '../types';
import { DEFAULT_EXPORT_STYLES } from '../types';
import { getVisibleContentAtTime } from '../generators';

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#0ea5e9', '#a78bfa'
];

function getInitials(name: string): string {
  if (!name) return '?';
  if (name.length === 1) return name.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function measureTextWidth(ctx: CanvasRenderingContext2D, text: string, fontSize: number): number {
  ctx.font = `${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
  return ctx.measureText(text).width;
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  name: string,
  _avatarUrl?: string
) {
  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const color = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length];

  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size * 0.4}px "Microsoft YaHei", "PingFang SC", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(getInitials(name), x + size / 2, y + size / 2);
}

function drawBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  isUser: boolean,
  styles: typeof DEFAULT_EXPORT_STYLES
) {
  const bg = isUser ? styles.bubbleRightBg : styles.bubbleLeftBg;

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();

  ctx.fillStyle = bg;
  ctx.fill();
}

function drawTextWithEmoji(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  color: string,
  lineHeight: number
): { width: number; height: number } {
  ctx.fillStyle = color;
  ctx.font = `${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
  ctx.textBaseline = 'top';

  const emojiRegex = /\[[^\]]{1,10}\]/g;
  const parts: Array<{ type: 'text' | 'emoji'; value: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = emojiRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.substring(lastIndex, match.index) });
    }
    parts.push({ type: 'emoji', value: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.substring(lastIndex) });
  }

  let currentX = x;
  let currentY = y;
  let lineWidth = 0;
  let maxLineWidth = 0;
  let totalHeight = 0;

  for (const part of parts) {
    if (part.type === 'text') {
      const words = part.value.split('');
      for (const char of words) {
        const charWidth = ctx.measureText(char).width;

        if (lineWidth + charWidth > maxWidth && lineWidth > 0) {
          currentX = x;
          currentY += lineHeight;
          lineWidth = 0;
          totalHeight += lineHeight;
        }

        ctx.fillText(char, currentX, currentY);
        currentX += charWidth;
        lineWidth += charWidth;
        maxLineWidth = Math.max(maxLineWidth, lineWidth);
      }
    } else {
      const emojiWidth = fontSize * 1.2;
      if (lineWidth + emojiWidth > maxWidth && lineWidth > 0) {
        currentX = x;
        currentY += lineHeight;
        lineWidth = 0;
        totalHeight += lineHeight;
      }

      ctx.fillStyle = '#888';
      ctx.font = `${fontSize * 1.2}px sans-serif`;
      ctx.fillText(part.value, currentX, currentY - 2);
      currentX += emojiWidth;
      lineWidth += emojiWidth;
      maxLineWidth = Math.max(maxLineWidth, lineWidth);
      ctx.fillStyle = color;
      ctx.font = `${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
    }
  }

  return {
    width: maxLineWidth || ctx.measureText(text).width,
    height: totalHeight + lineHeight,
  };
}

function drawCursor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  blinkRate: number,
  currentTime: number
) {
  const phase = (currentTime % blinkRate) / blinkRate;
  if (phase < 0.5) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(x, y, 2, height);
  }
}

export function renderTypingFrame(
  context: TypingRenderContext,
  messages: Message[],
  sequences: Map<string, MessageTypingSequence>,
  elapsedTime: number,
  config: TypingAnimationConfig,
  exportConfig: ExportConfig,
  users: UserProfile[] = [],
  darkMode: boolean = false
) {
  const { ctx, width, height } = context;
  const styles = { ...DEFAULT_EXPORT_STYLES, ...exportConfig.styles };

  ctx.fillStyle = darkMode ? '#1f1f1f' : (styles.background || DEFAULT_EXPORT_STYLES.background);
  ctx.fillRect(0, 0, width, height);

  const headerHeight = styles.avatarSize + 8;
  const padding = 10;
  const gap = 8;
  const avatarSize = styles.avatarSize;
  const fontSize = styles.fontSize;
  const bubblePadding = styles.bubblePadding;
  const bubbleRadius = styles.bubbleRadius;

  ctx.fillStyle = darkMode ? '#2d2d2d' : styles.headerBg;
  ctx.fillRect(0, 0, width, headerHeight);

  ctx.fillStyle = darkMode ? '#ffffff' : styles.headerColor;
  ctx.font = `bold ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(styles.headerColor || 'Chat', width / 2, headerHeight / 2);

  ctx.textAlign = 'left';

  let y = headerHeight + padding;
  let currentTypingMessageId: string | null = null;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const isUser = msg.role === 'user';
    const sequence = sequences.get(msg.id);
    const user = users.find(u => u.name === msg.sender);
    const avatar = user?.avatar || msg.avatar;

    let visibleContent = '';
    let isTyping = false;
    let currentTypingTime = elapsedTime;

    if (sequence) {
      const result = getVisibleContentAtTime(sequence, currentTypingTime);
      visibleContent = result.text;
      isTyping = result.isTyping;
      if (isTyping && !currentTypingMessageId) {
        currentTypingMessageId = msg.id;
      }
    }

    if (msg.type === 'system') {
      const systemText = msg.system?.text || msg.content || '';
      ctx.font = `${fontSize * 0.9}px "Microsoft YaHei", "PingFang SC", sans-serif`;
      const textWidth = ctx.measureText(systemText).width + 30;

      ctx.fillStyle = darkMode ? '#333' : '#f0f0f0';
      ctx.beginPath();
      ctx.roundRect((width - textWidth) / 2, y, textWidth, 24, 12);
      ctx.fill();

      ctx.fillStyle = darkMode ? '#888' : '#888';
      ctx.textAlign = 'center';
      ctx.fillText(systemText, width / 2, y + 12);
      ctx.textAlign = 'left';

      y += 28 + gap;
      continue;
    }

    const avatarX = isUser ? width - padding - avatarSize : padding;
    drawAvatar(ctx, avatarX, y, avatarSize, msg.sender, avatar);

    const maxBubbleWidth = width * 0.65;
    const textWidth = measureTextWidth(ctx, visibleContent, fontSize);
    const bubbleWidth = Math.min(textWidth + bubblePadding * 2, maxBubbleWidth);
    const lineHeight = fontSize * 1.4;
    const textHeight = Math.max(lineHeight, drawTextWithEmoji(ctx, visibleContent, 0, 0, bubbleWidth - bubblePadding * 2, fontSize, '#000', lineHeight).height);
    const bubbleHeight = textHeight + bubblePadding * 2;

    const bubbleX = isUser ? avatarX - gap - bubbleWidth : avatarX + avatarSize + gap;
    const senderHeight = avatarSize * 0.33;
    const bubbleY = y + senderHeight;

    if (visibleContent) {
      drawBubble(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, bubbleRadius, isUser, styles);

      const textColor = isUser ? styles.bubbleRightColor : styles.bubbleLeftColor;
      drawTextWithEmoji(
        ctx,
        visibleContent,
        bubbleX + bubblePadding,
        bubbleY + bubblePadding,
        bubbleWidth - bubblePadding * 2,
        fontSize,
        darkMode ? '#fff' : textColor,
        lineHeight
      );

      if (isTyping && msg.id === currentTypingMessageId && config.cursorEnabled) {
        const lastLineWidth = textWidth % (bubbleWidth - bubblePadding * 2);
        const cursorX = bubbleX + bubblePadding + (lastLineWidth > 0 ? lastLineWidth : 0);
        const cursorY = bubbleY + bubblePadding + Math.floor(textWidth / (bubbleWidth - bubblePadding * 2)) * lineHeight;
        drawCursor(ctx, cursorX, cursorY, fontSize, config.cursorBlinkRate, elapsedTime);
      }
    }

    y += Math.max(avatarSize, bubbleHeight + senderHeight) + gap;
  }
}

export function renderTypingFrames(
  messages: Message[],
  sequences: Map<string, MessageTypingSequence>,
  config: TypingAnimationConfig,
  exportConfig: ExportConfig,
  onProgress?: (progress: number) => void
): HTMLCanvasElement[] {
  const frames: HTMLCanvasElement[] = [];
  const fps = exportConfig.fps || 30;
  const frameInterval = 1000 / fps;

  let totalDuration = 0;
  for (const seq of sequences.values()) {
    totalDuration = Math.max(totalDuration, seq.totalDuration);
  }
  totalDuration += 1000;

  const canvas = document.createElement('canvas');
  const dpr = 2;
  canvas.width = exportConfig.width * dpr;
  canvas.height = exportConfig.height * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  const context: TypingRenderContext = {
    canvas,
    ctx,
    width: exportConfig.width,
    height: exportConfig.height,
    darkMode: false,
  };

  const totalFrames = Math.ceil(totalDuration / frameInterval);

  for (let frame = 0; frame < totalFrames; frame++) {
    const elapsedTime = frame * frameInterval;

    renderTypingFrame(
      context,
      messages,
      sequences,
      elapsedTime,
      config,
      exportConfig,
      [],
      false
    );

    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = canvas.width;
    frameCanvas.height = canvas.height;
    const frameCtx = frameCanvas.getContext('2d')!;
    frameCtx.drawImage(canvas, 0, 0);
    frames.push(frameCanvas);

    if (onProgress) {
      onProgress((frame / totalFrames) * 100);
    }
  }

  return frames;
}
