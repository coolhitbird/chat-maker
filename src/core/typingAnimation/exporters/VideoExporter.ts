import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import type { Message, UserProfile } from '@/types';
import type { TypingAnimationConfig, ExportConfig, MessageTypingSequence } from '../types';
import { generateTypingSequence, estimateDuration, calculateSpeedMultiplier } from '../generators';
import { DEFAULT_EXPORT_STYLES } from '../types';
import {
  LayoutConfig,
  DEFAULT_LAYOUT_CONFIG,
  calculateAllLayouts,
  calculateScrollOffset,
  wrapText,
  MessageLayout
} from '../renderers/layoutUtils';

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316', '#eab308', '#22c55e',
];

function getAvatarColor(name: string): string {
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  if (!name) return '?';
  if (name.length === 1) return name.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function drawAvatar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, name: string) {
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = getAvatarColor(name);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${size * 0.38}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(getInitials(name), x + size / 2, y + size / 2 + 2);
}

function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, bgColor: string) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
  ctx.fillStyle = bgColor;
  ctx.fill();
}

function drawSenderName(ctx: CanvasRenderingContext2D, x: number, y: number, name: string, align: CanvasTextAlign, fontSize: number) {
  ctx.fillStyle = '#888888';
  ctx.font = `${fontSize * 0.7}px "Microsoft YaHei", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'bottom';
  ctx.fillText(name, x, y);
}

function drawTextInBubble(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  color: string,
  lineHeight: number,
  bubbleHeight: number
) {
  ctx.fillStyle = color;
  ctx.font = `${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
  ctx.textAlign = 'left';
  const lines = wrapText(ctx, text, maxWidth);
  const totalTextHeight = lines.length * lineHeight;
  const verticalPadding = Math.max(0, (bubbleHeight - totalTextHeight) / 2);
  ctx.textBaseline = 'top';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, y + verticalPadding + i * lineHeight);
  }
}

function drawRedPacket(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rp: Message['redPacket'], isOpened: boolean, PAD: number, scale: number = 1) {
  const iconSize = Math.round(48 * scale);
  const bodyH = h - Math.round(32 * scale);
  const r = Math.min(Math.round(18 * scale), w / 2, bodyH / 2);

  const gradient = ctx.createLinearGradient(x, y, x + w, y + bodyH);
  gradient.addColorStop(0, '#FFB347');
  gradient.addColorStop(1, '#FF6B6B');

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + bodyH);
  ctx.lineTo(x, y + bodyH);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  const iconX = x + Math.round(PAD * scale);
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

  const contentX = iconX + iconSize + Math.round(12 * scale);
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(16 * scale)}px "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('红包', contentX, iconY + Math.round(6 * scale));

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `${Math.round(12 * scale)}px "Microsoft YaHei", sans-serif`;
  ctx.fillText(rp?.greeting || '恭喜发财', contentX, iconY + Math.round(26 * scale));

  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fillRect(x, y + bodyH, w, Math.round(32 * scale));

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
  const statusText = isOpened ? (`已领取 ¥${((rp?.amount || 0) / 100).toFixed(2)}`) : '领取红包';
  ctx.fillText(statusText, x + w / 2, y + bodyH + Math.round(16 * scale));
}

function drawTransfer(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, tf: Message['transfer'], isReceived: boolean, PAD: number, scale: number = 1) {
  const iconSize = Math.round(44 * scale);
  const bodyH = h - Math.round(32 * scale);
  const r = Math.min(Math.round(18 * scale), w / 2, bodyH / 2);

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

  const iconX = x + Math.round(PAD * scale);
  const iconY = y + (bodyH - iconSize) / 2;
  ctx.fillStyle = '#07c160';
  ctx.beginPath();
  ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = `bold ${iconSize * 0.45}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('¥', iconX + iconSize / 2, iconY + iconSize / 2);

  const contentX = iconX + iconSize + Math.round(12 * scale);
  ctx.fillStyle = '#333';
  ctx.font = `bold ${Math.round(16 * scale)}px "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('转账', contentX, iconY + Math.round(4 * scale));

  ctx.font = `bold ${Math.round(18 * scale)}px "Microsoft YaHei", sans-serif`;
  ctx.fillText(`¥${((tf?.amount || 0) / 100).toFixed(2)}`, contentX, iconY + Math.round(24 * scale));

  ctx.fillStyle = '#fff';
  ctx.fillRect(x, y + bodyH, w, Math.round(32 * scale));

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
  ctx.fillText(isReceived ? '已收款' : '待收款', x + w / 2, y + bodyH + Math.round(16 * scale));
}

function drawVoice(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, voice: Message['voice'], bubbleColor: string, PAD: number, fontSize: number, lineHeight: number, scale: number = 1, darkMode: boolean = false) {
  const iconSize = Math.round(16 * scale);
  const waveAreaH = Math.round(40 * scale);
  const bubbleRadius = Math.round(18 * scale);
  const durationFontSize = Math.round(12 * scale);

  drawBubble(ctx, x, y, w, h, bubbleRadius, bubbleColor);

  ctx.fillStyle = bubbleColor === '#95ec69' ? '#fff' : '#333';
  ctx.beginPath();
  ctx.moveTo(x + PAD, y + (waveAreaH - iconSize) / 2);
  ctx.lineTo(x + PAD, y + (waveAreaH + iconSize) / 2);
  ctx.lineTo(x + PAD + iconSize, y + waveAreaH / 2);
  ctx.closePath();
  ctx.fill();

  const waveX = x + PAD + iconSize + Math.round(8 * scale);
  const barWidth = Math.max(1, Math.round(3 * scale));
  const barGap = Math.max(1, Math.round(3 * scale));
  ctx.fillStyle = bubbleColor === '#95ec69' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.3)';
  for (let i = 0; i < 8; i++) {
    const barH = (Math.sin(i * 0.8) * 0.5 + 0.5) * Math.round(16 * scale) + Math.round(4 * scale);
    ctx.fillRect(waveX + i * (barWidth + barGap), y + (waveAreaH - barH) / 2, barWidth, barH);
  }

  ctx.fillStyle = bubbleColor === '#95ec69' ? '#fff' : '#999';
  ctx.font = `${durationFontSize}px "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${voice?.duration || 0}"`, x + w - PAD - Math.round(40 * scale), y + waveAreaH / 2);

  if (voice?.text) {
    const textTopPadding = Math.round(6 * scale);
    const textY = y + waveAreaH + textTopPadding;
    const textColor = darkMode ? '#fff' : '#333';
    ctx.fillStyle = textColor;
    ctx.font = `${fontSize}px "Microsoft YaHei", sans-serif`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    const lines = wrapText(ctx, voice.text, w - PAD * 2);
    for (let li = 0; li < lines.length && textY + li * lineHeight < y + h - PAD; li++) {
      ctx.fillText(lines[li], x + PAD, textY + li * lineHeight);
    }
  }
}

function drawImage(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, img: Message['image'], imageCache: Map<string, HTMLImageElement>, scale: number = 1) {
  const RADIUS = Math.round(18 * scale);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + RADIUS, y);
  ctx.lineTo(x + w - RADIUS, y);
  ctx.arcTo(x + w, y, x + w, y + RADIUS, RADIUS);
  ctx.lineTo(x + w, y + h - RADIUS);
  ctx.arcTo(x + w, y + h, x + w - RADIUS, y + h, RADIUS);
  ctx.lineTo(x + RADIUS, y + h);
  ctx.arcTo(x, y + h, x, y + h - RADIUS, RADIUS);
  ctx.lineTo(x, y + RADIUS);
  ctx.arcTo(x, y, x + RADIUS, y, RADIUS);
  ctx.closePath();
  ctx.clip();

  ctx.fillStyle = '#e0e0e0';
  ctx.fillRect(x, y, w, h);

  if (img?.url) {
    if (!imageCache.has(img.url)) {
      const tempImg = new Image();
      tempImg.crossOrigin = 'anonymous';
      tempImg.src = img.url;
      imageCache.set(img.url, tempImg);
    }
    const cachedImg = imageCache.get(img.url);
    if (cachedImg?.complete && cachedImg.naturalWidth > 0) {
      const imgScale = Math.min(w / cachedImg.naturalWidth, h / cachedImg.naturalHeight);
      const drawW = cachedImg.naturalWidth * imgScale;
      const drawH = cachedImg.naturalHeight * imgScale;
      const drawX = x + (w - drawW) / 2;
      const drawY = y + (h - drawH) / 2;
      ctx.drawImage(cachedImg, drawX, drawY, drawW, drawH);
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

  if (img?.caption) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, y + h - Math.round(24 * scale), w, Math.round(24 * scale));
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.round(12 * scale)}px "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(img.caption, x + w / 2, y + h - Math.round(12 * scale));
  }
}

function drawSystemMessage(ctx: CanvasRenderingContext2D, _x: number, y: number, w: number, text: string, type: string, scale: number = 1) {
  const styles: Record<string, { bg: string; color: string }> = {
    recall: { bg: '#f5f5f5', color: '#999' },
    pat: { bg: '#fff8e1', color: '#ff9800' },
    default: { bg: '#f0f0f0', color: '#666' }
  };
  const s = styles[type] || styles.default;

  const systemFontSize = Math.round(12 * scale);
  const boxPaddingH = Math.round(20 * scale);
  const boxHeight = Math.round(30 * scale);
  const boxRadius = Math.round(12 * scale);

  ctx.font = `${systemFontSize}px "Microsoft YaHei", sans-serif`;
  const textW = ctx.measureText(text).width;
  const boxW = textW + boxPaddingH * 2;
  const boxX = (w - boxW) / 2;

  ctx.fillStyle = s.bg;
  ctx.beginPath();
  ctx.roundRect(boxX, y, boxW, boxHeight, boxRadius);
  ctx.fill();

  ctx.fillStyle = s.color;
  ctx.font = `italic ${systemFontSize}px "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, y + boxHeight / 2);
}

export interface MessageTiming {
  messageId: string;
  appearTime: number;
  typingStartTime: number;
  typingEndTime: number;
  endTime: number;
}

function calculateMessageTimings(
  messages: Message[],
  sequences: Map<string, MessageTypingSequence>,
  config: TypingAnimationConfig,
  messageInterval: number = 1500
): { timings: MessageTiming[]; speedMultiplier: number } {
  const timings: MessageTiming[] = [];
  let currentTime = 0;

  const estimatedMs = estimateDuration(messages, config) * 1000;
  const speedMultiplier = calculateSpeedMultiplier(estimatedMs / 1000, config.targetDuration);

  for (const msg of messages) {
    const appearTime = currentTime;

    if (msg.type === 'system') {
      const duration = 800;
      timings.push({
        messageId: msg.id,
        appearTime,
        typingStartTime: appearTime,
        typingEndTime: appearTime + 200,
        endTime: appearTime + duration,
      });
      currentTime = appearTime + duration;
    } else if (msg.type === 'voice') {
      const typingDuration = 100;
      timings.push({
        messageId: msg.id,
        appearTime,
        typingStartTime: appearTime,
        typingEndTime: appearTime + typingDuration,
        endTime: appearTime + typingDuration,
      });
      currentTime = appearTime + typingDuration;
    } else {
      const sequence = sequences.get(msg.id);
      const typingDuration = sequence ? sequence.totalDuration : (config.fastMode ? 100 : config.baseSpeed * (msg.content?.length || 10));
      const typingEndTime = appearTime + typingDuration;
      const endTime = typingEndTime + messageInterval;

      timings.push({
        messageId: msg.id,
        appearTime,
        typingStartTime: appearTime,
        typingEndTime,
        endTime,
      });

      currentTime = endTime;
    }
  }

  return { timings, speedMultiplier };
}

function getTypingProgressAtTime(
  msg: Message,
  elapsedTime: number,
  timing: MessageTiming,
  sequences: Map<string, MessageTypingSequence>,
  _fastMode: boolean
): { text: string; isTyping: boolean } {
  if (msg.type === 'system') {
    return { text: msg.content || '', isTyping: false };
  }

  // 消息还未出现
  if (elapsedTime < timing.typingStartTime) {
    return { text: '', isTyping: false };
  }

  // 语音消息（不管有没有文字）：直接显示完整内容，不打字动画
  if (msg.type === 'voice') {
    return { text: msg.voice?.text || '', isTyping: false };
  }

  if (!sequences.has(msg.id)) {
    return { text: msg.content || '', isTyping: false };
  }

  const sequence = sequences.get(msg.id)!;
  const typingElapsed = elapsedTime - timing.typingStartTime;
  let text = '';

  for (const event of sequence.events) {
    if (event.timestamp > typingElapsed) break;

    switch (event.type) {
      case 'char':
      case 'emoji':
        text += event.content || '';
        break;
      case 'backspace':
        text = text.slice(0, -1);
        break;
      case 'paste-flash':
        text += event.content || '';
        break;
    }
  }

  const isTyping = typingElapsed < sequence.totalDuration;
  return { text, isTyping };
}

function renderFrame(
  ctx: CanvasRenderingContext2D,
  layoutConfig: LayoutConfig,
  layouts: MessageLayout[],
  typingProgress: Map<string, { text: string; isTyping: boolean }>,
  scrollOffset: number,
  darkMode: boolean,
  imageCache: Map<string, HTMLImageElement>,
  scale: number,
  title: string = 'Chat'
): void {
  const styles = DEFAULT_EXPORT_STYLES;
  const { width, height, headerHeight, statusBarHeight, fontSize, bubblePadding, bubbleRadius, contentPadding, gap } = layoutConfig;
  const lineHeight = Math.round(fontSize * 1.4);
  const senderHeight = Math.round(layoutConfig.avatarSize * 0.33);

  const isMobile = statusBarHeight > 0;

  ctx.fillStyle = darkMode ? '#1f1f1f' : styles.background;
  ctx.fillRect(0, 0, width, height);

  // Draw status bar (mobile/portrait only)
  if (isMobile) {
    const showStatusBar = (styles as any).showStatusBar !== false;
    if (showStatusBar) {
      const statusBg = darkMode ? '#1a1a1a' : ((styles as any).statusBarBg || styles.headerBg);
      const statusColor = darkMode ? '#888' : ((styles as any).statusBarColor || styles.headerColor);
      ctx.fillStyle = statusBg;
      ctx.fillRect(0, 0, width, statusBarHeight);

      const statusFontSize = Math.round(10 * scale);
      ctx.fillStyle = statusColor;
      ctx.font = `500 ${statusFontSize}px "Microsoft YaHei", sans-serif`;
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

  ctx.fillStyle = darkMode ? '#2d2d2d' : styles.headerBg;
  ctx.fillRect(0, statusBarHeight, width, headerHeight);

  ctx.fillStyle = darkMode ? '#ffffff' : styles.headerColor;
  ctx.font = `bold ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, width / 2, statusBarHeight + headerHeight / 2);

  for (const layout of layouts) {
    const { msg, avatarX, senderNameX, isUser, rowHeight } = layout;
    const adjustedY = layout.y - scrollOffset;

    if (adjustedY + rowHeight < headerHeight + statusBarHeight - 20 || adjustedY > height + 20) {
      continue;
    }

    if (msg.type === 'system' && msg.system) {
      drawSystemMessage(ctx, avatarX, adjustedY, width - contentPadding * 2, msg.system?.text || '', msg.system?.type || 'default', scale);
      continue;
    }

    drawAvatar(ctx, avatarX, adjustedY, layoutConfig.avatarSize, msg.sender);

    drawSenderName(ctx, senderNameX, adjustedY + senderHeight, msg.sender, isUser ? 'right' : 'left', fontSize);

    const bubbleBg = isUser ? styles.bubbleRightBg : styles.bubbleLeftBg;
    const bubbleColor = isUser ? styles.bubbleRightColor : styles.bubbleLeftColor;
    const typingState = typingProgress.get(msg.id);
    const text = typingState?.text ?? '';

    const actualBubbleX = isUser ? avatarX - gap - layout.bubbleWidth : avatarX + layoutConfig.avatarSize + gap;
    const actualBubbleY = adjustedY + senderHeight;

    if (msg.type === 'redpacket') {
      drawRedPacket(ctx, actualBubbleX, actualBubbleY, layout.bubbleWidth, layout.bubbleHeight, msg.redPacket, msg.redPacket?.isOpened || false, bubblePadding, scale);
    } else if (msg.type === 'transfer') {
      drawTransfer(ctx, actualBubbleX, actualBubbleY, layout.bubbleWidth, layout.bubbleHeight, msg.transfer, msg.transfer?.isReceived || false, bubblePadding, scale);
    } else if (msg.type === 'voice') {
      drawVoice(ctx, actualBubbleX, actualBubbleY, layout.bubbleWidth, layout.bubbleHeight, msg.voice, bubbleBg, bubblePadding, fontSize, lineHeight, scale, darkMode);
    } else if (msg.type === 'image') {
      drawImage(ctx, actualBubbleX, actualBubbleY, layout.bubbleWidth, layout.bubbleHeight, msg.image, imageCache, scale);
    } else if (text) {
      drawBubble(ctx, actualBubbleX, actualBubbleY, layout.bubbleWidth, layout.bubbleHeight, bubbleRadius, bubbleBg);
      drawTextInBubble(ctx, text, actualBubbleX + bubblePadding, actualBubbleY + bubblePadding, layout.bubbleWidth - bubblePadding * 2, fontSize, bubbleColor, lineHeight, layout.bubbleHeight - bubblePadding * 2);
    }
  }
}

export class TypingVideoExporter {
  private ffmpeg: FFmpeg | null = null;
  private loaded: boolean = false;

  async init(): Promise<void> {
    if (this.loaded) return;

    this.ffmpeg = new FFmpeg();

    this.ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg]', message);
    });

    this.ffmpeg.on('progress', ({ progress }) => {
      console.log('[FFmpeg Progress]', Math.round(progress * 100), '%');
    });

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    this.loaded = true;
  }

  async export(
    messages: Message[],
    config: TypingAnimationConfig,
    exportConfig: ExportConfig,
    _users: UserProfile[] = [],
    darkMode: boolean = false,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    if (!this.loaded) {
      await this.init();
    }

    const ffmpeg = this.ffmpeg!;
    const fps = exportConfig.fps || 30;
    const frameInterval = 1000 / fps;
    const messageInterval = 1500;

    onProgress?.(5);

    const sequences = new Map<string, MessageTypingSequence>();
    if (config.enabled) {
      for (const msg of messages) {
        if (msg.type !== 'system') {
          sequences.set(msg.id, generateTypingSequence(msg, config));
        }
      }
    }

    const imageCache = new Map<string, HTMLImageElement>();
    const imageUrls = messages
      .filter(m => m.type === 'image' && m.image?.url)
      .map(m => m.image!.url!);

    for (const url of imageUrls) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      imageCache.set(url, img);
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    }

    await document.fonts.ready;
    onProgress?.(10);

    const canvas = document.createElement('canvas');
    const dpr = 2;
    const width = exportConfig.width;
    const height = exportConfig.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const BASE_WIDTH = 375;
    const scale = width / BASE_WIDTH;
    const isMobile = width < height;
    const statusBarHeight = isMobile ? Math.round(24 * scale) : 0;

    const layoutConfig: LayoutConfig = {
      ...DEFAULT_LAYOUT_CONFIG,
      width,
      height,
      headerHeight: Math.round((exportConfig.styles?.avatarSize || 40) * scale) + Math.round(8 * scale),
      statusBarHeight,
      avatarSize: Math.round((exportConfig.styles?.avatarSize || 40) * scale),
      fontSize: Math.round((exportConfig.styles?.fontSize || 16) * scale),
      bubblePadding: Math.round((exportConfig.styles?.bubblePadding || 12) * scale),
      bubbleRadius: Math.round((exportConfig.styles?.bubbleRadius || 18) * scale),
    };

    const { timings, speedMultiplier } = calculateMessageTimings(messages, sequences, config, messageInterval);
    let totalDuration = 0;
    for (const t of timings) {
      totalDuration = Math.max(totalDuration, t.endTime);
    }
    totalDuration += 1000;

    // 每帧时间步长 = frameInterval * speedMultiplier
    const timeStep = frameInterval * speedMultiplier;
    const totalFrames = Math.ceil(totalDuration / timeStep);
    let frameIndex = 0;

    for (let t = 0; t <= totalDuration; t += timeStep) {
      // 当前可见的消息（只显示当前正在打字的消息）
      const visibleMessages: Message[] = [];
      const typingProgress = new Map<string, { text: string; isTyping: boolean }>();
      
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const timing = timings[i];
        
        // 只显示当前帧时间之前出现的消息
        if (t < timing.appearTime) break;
        
        visibleMessages.push(msg);
        
        // 计算打字进度
        const elapsedTime = (t - timing.appearTime) * speedMultiplier;
        const progress = getTypingProgressAtTime(msg, elapsedTime, timing, sequences, config.fastMode);
        typingProgress.set(msg.id, progress);
      }

      const { layouts, totalHeight } = calculateAllLayouts(ctx, visibleMessages, layoutConfig, typingProgress, undefined, scale);
      const scrollOffset = calculateScrollOffset(layouts, totalHeight, layoutConfig, true);

      renderFrame(ctx, layoutConfig, layouts, typingProgress, scrollOffset, darkMode, imageCache, scale, 'Chat');

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });

      if (blob) {
        const filename = `frame${String(frameIndex).padStart(5, '0')}.png`;
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        await ffmpeg.writeFile(filename, uint8Array);
        frameIndex++;
      }

      const progress = 10 + Math.round((frameIndex / totalFrames) * 70);
      onProgress?.(Math.min(progress, 80));
    }

    onProgress?.(80);

    await ffmpeg.exec([
      '-framerate', String(fps),
      '-i', 'frame%05d.png',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'fast',
      'output.mp4'
    ]);

    onProgress?.(95);

    const data = await ffmpeg.readFile('output.mp4');
    const videoBlob = new Blob([data as BlobPart], { type: 'video/mp4' });

    for (let i = 0; i < frameIndex; i++) {
      const filename = `frame${String(i).padStart(5, '0')}.png`;
      await ffmpeg.deleteFile(filename);
    }
    await ffmpeg.deleteFile('output.mp4');

    onProgress?.(100);

    return videoBlob;
  }

  getEstimatedDuration(messages: Message[], config: TypingAnimationConfig): number {
    return estimateDuration(messages, config);
  }
}

export const typingVideoExporter = new TypingVideoExporter();
