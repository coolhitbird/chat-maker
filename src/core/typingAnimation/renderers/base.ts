import type { Message, UserProfile } from '@/types';
import type { TypingAnimationConfig, ExportConfig } from '../types';
import { DEFAULT_EXPORT_STYLES } from '../types';

export interface TypingRenderer {
  init(): Promise<void>;
  render(
    messages: Message[],
    config: TypingAnimationConfig,
    exportConfig: ExportConfig,
    users?: UserProfile[],
    darkMode?: boolean,
    onProgress?: (progress: number) => void
  ): Promise<Blob>;
  getEstimatedDuration(messages: Message[], config: TypingAnimationConfig): number;
}

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

function getAvatarColor(name: string): string {
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function drawTypingAvatar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  name: string
) {
  const color = getAvatarColor(name);
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size * 0.4}px "Microsoft YaHei", "PingFang SC", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(getInitials(name), x + size / 2, y + size / 2);
  ctx.textAlign = 'left';
}

export function drawTypingBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  isUser: boolean,
  styles: typeof DEFAULT_EXPORT_STYLES,
  darkMode: boolean
) {
  const bg = isUser
    ? (darkMode ? '#128400' : styles.bubbleRightBg)
    : (darkMode ? '#2d2d2d' : styles.bubbleLeftBg);

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  ctx.fillStyle = bg;
  ctx.fill();
}

export function drawTypingText(
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
  let totalHeight = lineHeight;

  for (const part of parts) {
    if (part.type === 'text') {
      for (const char of part.value) {
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
    }
  }

  return {
    width: maxLineWidth || ctx.measureText(text).width,
    height: totalHeight,
  };
}

export function drawTypingCursor(
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

export interface MessageRenderData {
  msg: Message;
  visibleContent: string;
  isTyping: boolean;
  bubbleWidth: number;
  bubbleHeight: number;
  totalHeight: number;
}
