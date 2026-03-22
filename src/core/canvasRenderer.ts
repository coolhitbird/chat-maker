import type { Message, ThemeStyles, UserProfile } from '@/types';
import { defaultLayoutConfig } from './messageLayout';

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

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  // 文字安全边距，防止渲染溢出
  const safeMargin = 2;
  const effectiveMaxWidth = maxWidth - safeMargin;
  
  const chars = text.split('');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const char of chars) {
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);
    
    // 如果当前行加上新字符超过了有效宽度，就换行
    if (metrics.width > effectiveMaxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines.length > 0 ? lines : [''];
}

export interface RenderOptions {
  width: number;
  height: number;
  styles: ThemeStyles;
  title: string;
  messages: Message[];
  users: UserProfile[];
  scale?: number;
}

export function renderChatToCanvas(canvas: HTMLCanvasElement, options: RenderOptions): void {
  const { width, height, styles, title, messages, users } = options;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const userAvatarMap = new Map<string, string>();
  users.forEach(u => userAvatarMap.set(u.name, u.avatar));

  const headerHeight = styles.avatarSize + 8;
  const avatarSize = styles.avatarSize;
  const gap = styles.messageGap;
  const bubblePaddingH = styles.bubblePadding + 2;
  const bubblePaddingV = styles.bubblePadding;
  const bubbleRadius = styles.bubbleRadius;
  const fontSize = styles.fontSize;
  const lineHeight = fontSize * 1.5;
  const contentPadding = styles.messageGap;

  ctx.font = `${fontSize}px ${styles.fontFamily}`;

  // 第一遍：计算所有消息需要的总高度
  let totalContentHeight = contentPadding;
  for (const msg of messages) {
    const maxBubbleWidth = width - avatarSize * 2 - contentPadding * 2 - gap * 2;
    const lines = wrapText(ctx, msg.content, maxBubbleWidth - bubblePaddingH * 2);
    const bubbleHeight = lines.length * lineHeight + bubblePaddingV * 2;
    const rowHeight = Math.max(avatarSize, bubbleHeight) + gap;
    totalContentHeight += rowHeight;
  }

  // Canvas 高度 = header + 内容高度
  const actualHeight = Math.max(height, headerHeight + totalContentHeight + contentPadding);

  canvas.width = width;
  canvas.height = actualHeight;

  // 绘制背景
  ctx.fillStyle = styles.background;
  ctx.fillRect(0, 0, width, actualHeight);

  // 绘制头部
  ctx.fillStyle = styles.headerBg;
  ctx.fillRect(0, 0, width, headerHeight);

  ctx.fillStyle = styles.headerColor;
  ctx.font = `bold ${styles.fontSize}px ${styles.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, width / 2, headerHeight / 2);

  ctx.font = `${fontSize}px ${styles.fontFamily}`;

  const chatTop = headerHeight;
  let y = chatTop + contentPadding;

  for (const msg of messages) {
    const isUser = msg.role === 'user';
    const bubbleBg = isUser ? styles.bubbleRightBg : styles.bubbleLeftBg;
    const bubbleColor = isUser ? styles.bubbleRightColor : styles.bubbleLeftColor;

    // 头像占据整列，从 y 开始
    const avatarX = isUser ? width - contentPadding - avatarSize : contentPadding;
    const avatarY = y;
    drawAvatar(ctx, avatarX, avatarY, avatarSize, msg.sender);

    // 布局约束: [contentPadding] [avatar] [gap] [气泡区域] [gap] [avatar] [contentPadding]
    // 气泡最大宽度 = 总宽度 - 两个头像 - contentPadding*2 - gap*2
    const totalMiddleWidth = width - avatarSize * 2 - contentPadding * 2 - gap * 2;
    const maxBubbleWidth = totalMiddleWidth;
    const lineHeight = fontSize * 1.5;
    const senderHeight = fontSize * 0.7;

    // 文字安全边距
    const textSafeMargin = 4;

    // 气泡宽度 = 文字宽度 + padding，最大不超过 maxBubbleWidth
    // 测量时使用减去安全边距的宽度
    const tempLines = wrapText(ctx, msg.content, maxBubbleWidth - bubblePaddingH * 2);
    const maxLineWidth = Math.max(...tempLines.map(line => ctx.measureText(line).width));
    // 计算气泡宽度时考虑文字边距
    const bubbleWidth = Math.min(maxLineWidth + bubblePaddingH * 2, maxBubbleWidth);
    // 文字最大宽度 = 气泡宽度 - 左右padding - 安全边距
    const textMaxWidth = bubbleWidth - bubblePaddingH * 2 - textSafeMargin;
    // 重新换行以匹配实际气泡宽度
    const lines = wrapText(ctx, msg.content, textMaxWidth);
    const bubbleHeight = lines.length * lineHeight + bubblePaddingV * 2;

    // 使用共享配置
    const senderHeightRatio = defaultLayoutConfig.avatarSection.senderName.heightRatio;
    const bubbleTopRatio = defaultLayoutConfig.avatarSection.bubble.topRatio;

    // 用户名单独渲染，位置在头像高度的 0-{senderHeightRatio*100}% 区间（第1、2行）
    const senderX = isUser ? avatarX - gap : avatarX + gap + avatarSize;
    const senderY = y + avatarSize * senderHeightRatio; // 用户名底部在头像{senderHeightRatio*100}%处
    ctx.fillStyle = '#888';
    ctx.font = `${senderHeight}px ${styles.fontFamily}`;
    const senderAlign = isUser ? 'right' : 'left';
    ctx.textAlign = senderAlign as CanvasTextAlign;
    ctx.textBaseline = 'bottom';
    ctx.fillText(msg.sender, senderX, senderY);

    // 整行高度 = 头像高度
    // 气泡单独渲染，位置在头像高度的 {bubbleTopRatio*100}-100% 区间（第4、5、6行）
    // 气泡位置: 左边消息在avatar右边, 右边消息在avatar左边
    const bubbleX = isUser
      ? avatarX - gap - bubbleWidth
      : avatarX + gap + avatarSize;
    const bubbleY = y + avatarSize * bubbleTopRatio;

    // 绘制气泡
    drawBubble(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, bubbleRadius, bubbleBg);

    // 文字靠边显示 - 先确保字体正确
    ctx.font = `${fontSize}px ${styles.fontFamily}`;
    ctx.fillStyle = bubbleColor;
    ctx.textBaseline = 'middle';
    const textY = bubbleY + bubbleHeight * 0.5;
    
    for (let i = 0; i < lines.length; i++) {
      const lineOffset = (i - (lines.length - 1) / 2) * lineHeight;
      const lineWidth = ctx.measureText(lines[i]).width;
      
      if (isUser) {
        // 右对齐：每行文字的右边缘固定，文字向左延伸
        const textX = bubbleX + bubbleWidth - bubblePaddingH - lineWidth;
        ctx.textAlign = 'left'; // 临时设置为左对齐来精确控制位置
        ctx.fillText(lines[i], textX, textY + lineOffset);
      } else {
        // 左对齐：每行文字的左边缘固定，文字向右延伸
        const textX = bubbleX + bubblePaddingH;
        ctx.textAlign = 'left';
        ctx.fillText(lines[i], textX, textY + lineOffset);
      }
    }

    // 动态计算行高：头像高度 + 气泡高度（如果气泡超过头像）
    const bubbleBottom = bubbleY + bubbleHeight;
    const currentRowHeight = Math.max(avatarSize, bubbleBottom - y) + gap;
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
