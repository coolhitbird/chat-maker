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

      ctx.font = `${fontSize * 1.2}px sans-serif`;
      ctx.fillText(part.value, currentX, currentY - 2);
      currentX += emojiWidth;
      lineWidth += emojiWidth;
      maxLineWidth = Math.max(maxLineWidth, lineWidth);
      ctx.font = `${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
      ctx.fillStyle = color;
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

// ── 特殊消息绘制辅助函数 ────────────────────────────────────────────

function drawRedPacketFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rp: Message['redPacket'],
  isOpened: boolean,
  styles: typeof DEFAULT_EXPORT_STYLES,
  scale: number
) {
  const PAD = styles.bubblePadding;
  const iconSize = Math.round(48 * scale);
  const footerH = Math.round(32 * scale);
  const bodyH = h - footerH;
  const r = Math.min(Math.round(18 * scale), w / 2, bodyH / 2);

  // 橙红渐变主体
  const grad = ctx.createLinearGradient(x, y, x + w, y + bodyH);
  grad.addColorStop(0, '#FFB347');
  grad.addColorStop(1, '#FF6B6B');
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + bodyH);
  ctx.lineTo(x, y + bodyH);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // 钱袋图标
  const iconX = x + PAD;
  const iconY = y + (bodyH - iconSize) / 2;
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${iconSize * 0.5}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🧧', iconX + iconSize / 2, iconY + iconSize / 2);

  // 标题 + 祝福语
  const contentX = iconX + iconSize + Math.round(12 * scale);
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(16 * scale)}px "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('红包', contentX, iconY + Math.round(6 * scale));
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `${Math.round(12 * scale)}px "Microsoft YaHei", sans-serif`;
  ctx.fillText(rp?.greeting || '恭喜发财', contentX, iconY + Math.round(26 * scale));

  // 底部状态栏
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fillRect(x, y + bodyH, w, footerH);
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(x, y + bodyH);
  ctx.lineTo(x + w, y + bodyH);
  ctx.stroke();
  ctx.fillStyle = '#999';
  ctx.font = `${Math.round(11 * scale)}px "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    isOpened ? `已领取 ¥${((rp?.amount || 0) / 100).toFixed(2)}` : '领取红包',
    x + w / 2,
    y + bodyH + footerH / 2
  );
}

function drawTransferFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  tf: Message['transfer'],
  isReceived: boolean,
  styles: typeof DEFAULT_EXPORT_STYLES,
  scale: number
) {
  const PAD = styles.bubblePadding;
  const iconSize = Math.round(44 * scale);
  const footerH = Math.round(32 * scale);
  const bodyH = h - footerH;
  const r = Math.min(Math.round(18 * scale), w / 2, bodyH / 2);

  // 灰色主体
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + bodyH);
  ctx.lineTo(x, y + bodyH);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fillStyle = '#f5f5f5';
  ctx.fill();

  // 转账图标
  const iconX = x + PAD;
  const iconY = y + (bodyH - iconSize) / 2;
  ctx.fillStyle = '#07c160';
  ctx.beginPath();
  ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(iconSize * 0.45)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('¥', iconX + iconSize / 2, iconY + iconSize / 2);

  // 标题 + 金额
  const contentX = iconX + iconSize + Math.round(12 * scale);
  ctx.fillStyle = '#333';
  ctx.font = `bold ${Math.round(16 * scale)}px "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('转账', contentX, iconY + Math.round(4 * scale));
  ctx.font = `bold ${Math.round(18 * scale)}px "Microsoft YaHei", sans-serif`;
  ctx.fillText(`¥${((tf?.amount || 0) / 100).toFixed(2)}`, contentX, iconY + Math.round(24 * scale));

  // 底部状态栏
  ctx.fillStyle = '#fff';
  ctx.fillRect(x, y + bodyH, w, footerH);
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(x, y + bodyH);
  ctx.lineTo(x + w, y + bodyH);
  ctx.stroke();
  ctx.fillStyle = isReceived ? '#07c160' : '#999';
  ctx.font = `${Math.round(11 * scale)}px "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isReceived ? '已收款' : '待收款', x + w / 2, y + bodyH + footerH / 2);
}

function drawImageFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  img: Message['image'],
  imageCache: Map<string, HTMLImageElement>,
  scale: number
) {
  const R = Math.round(18 * scale);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + R, y);
  ctx.lineTo(x + w - R, y);
  ctx.arcTo(x + w, y, x + w, y + R, R);
  ctx.lineTo(x + w, y + h - R);
  ctx.arcTo(x + w, y + h, x + w - R, y + h, R);
  ctx.lineTo(x + R, y + h);
  ctx.arcTo(x, y + h, x, y + h - R, R);
  ctx.lineTo(x, y + R);
  ctx.arcTo(x, y, x + R, y, R);
  ctx.closePath();
  ctx.clip();

  ctx.fillStyle = '#e0e0e0';
  ctx.fillRect(x, y, w, h);

  if (img?.url) {
    if (!imageCache.has(img.url)) {
      const tmp = new Image();
      tmp.crossOrigin = 'anonymous';
      tmp.src = img.url;
      imageCache.set(img.url, tmp);
    }
    const cached = imageCache.get(img.url);
    if (cached?.complete && cached.naturalWidth > 0) {
      const s = Math.min(w / cached.naturalWidth, h / cached.naturalHeight);
      const dw = cached.naturalWidth * s;
      const dh = cached.naturalHeight * s;
      ctx.drawImage(cached, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    }
  } else {
    ctx.fillStyle = '#ccc';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, Math.round(12 * scale), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#999';
    ctx.font = `${Math.round(20 * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📷', x + w / 2, y + h / 2);
  }

  ctx.restore();
}

function drawVoiceFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  voice: Message['voice'],
  isUser: boolean,
  _darkMode: boolean,
  styles: typeof DEFAULT_EXPORT_STYLES,
  scale: number,
  visibleContent?: string
) {
  const PAD = styles.bubblePadding;
  const iconSize = Math.round(16 * scale);
  const waveAreaH = Math.round(40 * scale);
  const bubbleColor = isUser ? '#fff' : '#333';

  drawBubble(ctx, x, y, w, h, styles.bubbleRadius, isUser, styles);

  // 播放图标
  const iconX = x + PAD;
  const iconY = y + (waveAreaH - iconSize) / 2;
  ctx.fillStyle = bubbleColor;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(iconX, iconY);
  ctx.lineTo(iconX, iconY + iconSize);
  ctx.lineTo(iconX + iconSize, iconY + iconSize / 2);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // 波形
  const waveX = iconX + iconSize + Math.round(6 * scale);
  const barW = Math.max(1, Math.round(3 * scale));
  const barGap = Math.max(1, Math.round(2 * scale));
  ctx.fillStyle = bubbleColor;
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 8; i++) {
    const barH = (Math.sin(i * 0.8) * 0.5 + 0.5) * Math.round(16 * scale) + Math.round(4 * scale);
    ctx.fillRect(waveX + i * (barW + barGap), y + (waveAreaH - barH) / 2, barW, barH);
  }
  ctx.globalAlpha = 1;

  // 时长
  ctx.fillStyle = bubbleColor;
  ctx.globalAlpha = 0.6;
  ctx.font = `${Math.round(12 * scale)}px "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${voice?.duration || 0}"`, x + w - PAD - Math.round(36 * scale), y + waveAreaH / 2);
  ctx.globalAlpha = 1;
  if (voice?.text && visibleContent) {
    const textY = y + waveAreaH + PAD;
    const textColor = isUser ? '#333' : '#fff';
    const fontSize = styles.fontSize;
    const lineHeight = fontSize * 1.4;
    ctx.fillStyle = textColor;
    ctx.font = `${fontSize}px "Microsoft YaHei", sans-serif`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    const lines: string[] = [];
    let line = '';
    for (const ch of visibleContent) {
      const test = line + ch;
      if (ctx.measureText(test).width > w - PAD * 2 && line) {
        lines.push(line);
        line = ch;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    for (let li = 0; li < lines.length && textY + li * lineHeight < y + h - PAD; li++) {
      ctx.fillText(lines[li], x + PAD, textY + li * lineHeight);
    }
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
  darkMode: boolean = false,
  imageCache?: Map<string, HTMLImageElement>
) {
  const { ctx, width, height } = context;
  const styles = { ...DEFAULT_EXPORT_STYLES, ...exportConfig.styles };

  ctx.fillStyle = darkMode ? '#1f1f1f' : (styles.background || DEFAULT_EXPORT_STYLES.background);
  ctx.fillRect(0, 0, width, height);

  const BASE_WIDTH = 375;
  const scale = width / BASE_WIDTH;

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

  // 特殊消息的固定尺寸（按 scale 计算）
  const redPacketH = Math.round(102 * scale);
  const redPacketW = Math.round(180 * scale);
  const transferH = Math.round(120 * scale);
  const transferW = Math.round(180 * scale);
  const imageSize = Math.round(200 * scale);

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const isUser = msg.role === 'user';
    const sequence = sequences.get(msg.id);
    const user = users.find(u => u.name === msg.sender);
    const avatar = user?.avatar || msg.avatar;

    let visibleContent = '';
    let isTyping = false;
    const currentTypingTime = elapsedTime;

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

    // 绘制发消息人名字
    const senderNameX = isUser ? avatarX - gap : avatarX + avatarSize + gap;
    const senderHeight = avatarSize * 0.33;
    ctx.fillStyle = '#888';
    ctx.font = `${fontSize * 0.7}px "Microsoft YaHei", sans-serif`;
    ctx.textAlign = isUser ? 'right' : 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(msg.sender, senderNameX, y + senderHeight);
    ctx.textAlign = 'left';

    const maxBubbleWidth = width * 0.65;

    // ── 计算气泡尺寸 ──────────────────────────────────────
    let bubbleWidth: number;
    let bubbleHeight: number;

    if (msg.type === 'redpacket') {
      bubbleWidth = redPacketW;
      bubbleHeight = redPacketH;
    } else if (msg.type === 'transfer') {
      bubbleWidth = transferW;
      bubbleHeight = transferH;
    } else if (msg.type === 'image') {
      bubbleWidth = imageSize;
      bubbleHeight = imageSize;
    } else if (msg.type === 'voice') {
      const iconArea = Math.round(16 * scale);
      const durationArea = Math.round(44 * scale);
      const waveArea = Math.round(60 * scale);
      const voiceW = bubblePadding + iconArea + bubblePadding + waveArea + durationArea + bubblePadding;
      bubbleWidth = Math.min(voiceW, maxBubbleWidth);
      if (msg.voice?.text) {
        const lineHeight = fontSize * 1.4;
        const lines: string[] = [];
        let line = '';
        for (const ch of visibleContent) {
          const test = line + ch;
          if (ctx.measureText(test).width > bubbleWidth - bubblePadding * 2 && line) {
            lines.push(line);
            line = ch;
          } else {
            line = test;
          }
        }
        if (line) lines.push(line);
        const textH = lines.length * lineHeight;
        const quoteH = msg.quote ? Math.round(fontSize * 0.75) * 2 + Math.round(30 * scale) : 0;
        // 40(波形) + textH(文字) + 2*PAD(上下padding) + quoteH
        bubbleHeight = Math.round(40 * scale) + textH + bubblePadding * 2 + quoteH;
      } else {
        bubbleHeight = Math.round(40 * scale);
      }
    } else {
      // text / file
      const textWidth = measureTextWidth(ctx, visibleContent, fontSize);
      bubbleWidth = Math.min(textWidth + bubblePadding * 2, maxBubbleWidth);
      const lineHeight = fontSize * 1.4;
      const textHeight = Math.max(
        lineHeight,
        drawTextWithEmoji(ctx, visibleContent, 0, 0, bubbleWidth - bubblePadding * 2, fontSize, '#000', lineHeight).height
      );
      bubbleHeight = textHeight + bubblePadding * 2;
    }

    const bubbleX = isUser ? avatarX - gap - bubbleWidth : avatarX + avatarSize + gap;
    const bubbleY = y + senderHeight;

    // ── 绘制气泡内容 ────────────────────────────────────────
    if (msg.type === 'redpacket') {
      drawBubble(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, bubbleRadius, isUser, styles);
      drawRedPacketFrame(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, msg.redPacket, !!msg.redPacket?.isOpened, styles, scale);
    } else if (msg.type === 'transfer') {
      drawBubble(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, bubbleRadius, isUser, styles);
      drawTransferFrame(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, msg.transfer, !!msg.transfer?.isReceived, styles, scale);
    } else if (msg.type === 'image') {
      drawImageFrame(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, msg.image, imageCache ?? new Map(), scale);
    } else if (msg.type === 'voice') {
      drawVoiceFrame(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, msg.voice, isUser, darkMode, styles, scale, visibleContent);
    } else if (visibleContent) {
      // text / file（file 暂用文字渲染）
      drawBubble(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, bubbleRadius, isUser, styles);

      const textColor = isUser ? styles.bubbleRightColor : styles.bubbleLeftColor;
      const lineHeight = fontSize * 1.4;
      const quoteH = msg.quote ? Math.round(fontSize * 0.75) * 2 + Math.round(30 * scale) : 0;
      const textStartY = quoteH > 0 ? bubbleY + bubblePadding + quoteH : bubbleY + bubblePadding;
      drawTextWithEmoji(
        ctx,
        visibleContent,
        bubbleX + bubblePadding,
        textStartY,
        bubbleWidth - bubblePadding * 2,
        fontSize,
        darkMode ? '#fff' : textColor,
        lineHeight
      );

      if (isTyping && msg.id === currentTypingMessageId && config.cursorEnabled) {
        const tw = measureTextWidth(ctx, visibleContent, fontSize);
        const lastLineWidth = tw % (bubbleWidth - bubblePadding * 2);
        const cursorX = bubbleX + bubblePadding + (lastLineWidth > 0 ? lastLineWidth : 0);
        const cursorY = bubbleY + bubblePadding + Math.floor(tw / (bubbleWidth - bubblePadding * 2)) * lineHeight;
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
  users: UserProfile[] = [],
  darkMode: boolean = false,
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
    darkMode,
  };

  const imageCache = new Map<string, HTMLImageElement>();
  // 预加载消息图片
  for (const msg of messages) {
    if (msg.type === 'image' && msg.image?.url) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = msg.image.url;
      imageCache.set(msg.image.url, img);
    }
  }

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
      users,
      darkMode,
      imageCache
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
