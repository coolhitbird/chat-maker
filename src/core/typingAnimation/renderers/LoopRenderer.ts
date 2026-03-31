import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import type { Message, UserProfile } from '@/types';
import type { TypingAnimationConfig, ExportConfig, MessageTypingSequence } from '../types';
import { generateTypingSequence, getVisibleContentAtTime, estimateDuration, calculateSpeedMultiplier } from '../generators';
import { DEFAULT_EXPORT_STYLES } from '../types';
import {
  LayoutConfig,
  DEFAULT_LAYOUT_CONFIG,
  calculateAllLayouts,
  calculateScrollOffset,
  MessageLayout
} from './layoutUtils';

function drawAvatar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, name: string) {
  const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ef4444', '#f97316', '#eab308', '#22c55e'];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const color = colors[index % colors.length];

  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${size * 0.38}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.length <= 2 ? name.toUpperCase() : name.slice(0, 2).toUpperCase(), x + size / 2, y + size / 2 + 2);
}

function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, bg: string) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = bg;
  ctx.fill();
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
  ctx.fillText(isOpened ? `已领取 ¥${((rp?.amount || 0) / 100).toFixed(2)}` : '领取红包', x + w / 2, y + bodyH + Math.round(16 * scale));
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

function drawImageMessage(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, img: Message['image'], imageCache: Map<string, HTMLImageElement>, scale: number = 1) {
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
    const iconOuterRadius = Math.round(12 * scale);
    ctx.fillStyle = '#ccc';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, iconOuterRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#999';
    ctx.font = `${Math.round(20 * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📷', x + w / 2, y + h / 2);
  }

  ctx.restore();
}

function drawVoiceMessage(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, voice: Message['voice'], bubbleColor: string, PAD: number, fontSize: number, lineHeight: number, darkMode: boolean, scale: number = 1) {
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
    
    const lines: string[] = [];
    let line = '';
    for (const ch of voice.text) {
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
  
  const lines: string[] = [];
  let line = '';
  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  
  const totalTextHeight = lines.length * lineHeight;
  const verticalPadding = Math.max(0, (bubbleHeight - totalTextHeight) / 2);
  ctx.textBaseline = 'top';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, y + verticalPadding + i * lineHeight);
  }
}

function renderLayouts(
  ctx: CanvasRenderingContext2D,
  layouts: MessageLayout[],
  typingProgress: Map<string, { text: string; isTyping: boolean }>,
  scrollOffset: number,
  layoutConfig: LayoutConfig,
  darkMode: boolean,
  imageCache: Map<string, HTMLImageElement>,
  cursorEnabled: boolean,
  cursorBlinkRate: number,
  currentTime: number,
  scale: number
) {
  const styles = DEFAULT_EXPORT_STYLES;
  const { width, height, headerHeight, statusBarHeight, fontSize, bubblePadding, bubbleRadius } = layoutConfig;
  const lineHeight = Math.round(fontSize * 1.4);
  const senderHeight = Math.round(layoutConfig.avatarSize * 0.33);

  for (const layout of layouts) {
    const { msg, avatarX, rowHeight } = layout;
    const adjustedY = layout.y - scrollOffset;

    if (adjustedY + rowHeight < headerHeight + statusBarHeight - 20 || adjustedY > height + 20) {
      continue;
    }

    drawAvatar(ctx, avatarX, adjustedY, layoutConfig.avatarSize, msg.sender);

    if (msg.type === 'system') {
      const systemText = msg.system?.text || msg.content || '';
      const systemType = msg.system?.type || 'default';
      
      const systemStyles: Record<string, { bg: string; color: string; icon: string }> = {
        recall: { bg: '#f5f5f5', color: '#999', icon: '↩️' },
        pat: { bg: '#fff8e1', color: '#ff9800', icon: '🤚' },
        addFriend: { bg: '#e3f2fd', color: '#1976d2', icon: '👤' },
        invite: { bg: '#e8f5e9', color: '#388e3c', icon: '👥' },
        warning: { bg: '#fff3cd', color: '#856404', icon: '⚠️' },
        notification: { bg: '#fff3e0', color: '#e65100', icon: '📢' },
        default: { bg: '#f0f0f0', color: '#666', icon: 'ℹ️' }
      };
      const s = systemStyles[systemType] || systemStyles.default;
      
      const systemFontSize = Math.round(fontSize * 0.9);
      const boxPaddingH = Math.round(20 * scale);
      const boxHeight = Math.round(30 * scale);
      const boxRadius = Math.round(12 * scale);
      
      ctx.font = `${systemFontSize}px "Microsoft YaHei", sans-serif`;
      const textW = ctx.measureText(`${s.icon} ${systemText}`).width;
      const boxW = textW + boxPaddingH * 2;
      const boxX = (width - boxW) / 2;

      ctx.fillStyle = darkMode ? '#333' : s.bg;
      ctx.beginPath();
      ctx.roundRect(boxX, adjustedY, boxW, boxHeight, boxRadius);
      ctx.fill();

      ctx.fillStyle = darkMode ? '#888' : s.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${s.icon} ${systemText}`, width / 2, adjustedY + boxHeight / 2);
      ctx.textAlign = 'left';
      continue;
    }

    const typingState = typingProgress.get(msg.id);
    const text = typingState?.text || msg.content || '';
    const bubbleBg = layout.isUser ? styles.bubbleRightBg : styles.bubbleLeftBg;
    const bubbleColor = layout.isUser ? styles.bubbleRightColor : styles.bubbleLeftColor;

    if (msg.type === 'redpacket') {
      drawRedPacket(ctx, layout.bubbleX, adjustedY + senderHeight, layout.bubbleWidth, layout.bubbleHeight, msg.redPacket, msg.redPacket?.isOpened || false, bubblePadding, scale);
    } else if (msg.type === 'transfer') {
      drawTransfer(ctx, layout.bubbleX, adjustedY + senderHeight, layout.bubbleWidth, layout.bubbleHeight, msg.transfer, msg.transfer?.isReceived || false, bubblePadding, scale);
    } else if (msg.type === 'image') {
      drawImageMessage(ctx, layout.bubbleX, adjustedY + senderHeight, layout.bubbleWidth, layout.bubbleHeight, msg.image, imageCache, scale);
    } else if (msg.type === 'voice') {
      drawVoiceMessage(ctx, layout.bubbleX, adjustedY + senderHeight, layout.bubbleWidth, layout.bubbleHeight, msg.voice, bubbleBg, bubblePadding, fontSize, lineHeight, darkMode, scale);
    } else {
      drawBubble(ctx, layout.bubbleX, adjustedY + senderHeight, layout.bubbleWidth, layout.bubbleHeight, bubbleRadius, bubbleBg);
      drawTextInBubble(ctx, text, layout.bubbleX + bubblePadding, adjustedY + senderHeight + bubblePadding, layout.bubbleWidth - bubblePadding * 2, fontSize, bubbleColor, lineHeight, layout.bubbleHeight - bubblePadding * 2);

      if (cursorEnabled && typingState?.isTyping && layout.isCurrentTyping) {
        const lastLineWidth = Math.min(ctx.measureText(text).width, layout.bubbleWidth - bubblePadding * 2);
        const cursorX = layout.bubbleX + bubblePadding + lastLineWidth;
        const cursorY = adjustedY + senderHeight + bubblePadding;
        const showCursor = Math.floor(currentTime / cursorBlinkRate) % 2 === 0;
        if (showCursor) {
          ctx.fillStyle = bubbleColor;
          ctx.fillRect(cursorX, cursorY, 2, fontSize);
        }
      }
    }
  }
}

export class LoopTypingRenderer {
  private ffmpeg: FFmpeg | null = null;
  private loaded: boolean = false;

  async init(): Promise<void> {
    if (this.loaded) return;

    this.ffmpeg = new FFmpeg();

    this.ffmpeg.on('log', ({ message }) => {
      console.log('[LoopRenderer FFmpeg]', message);
    });

    this.ffmpeg.on('progress', ({ progress }) => {
      console.log('[LoopRenderer Progress]', Math.round(progress * 100), '%');
    });

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    this.loaded = true;
  }

  async render(
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

    const width = exportConfig.width;
    const height = exportConfig.height;
    
    const BASE_WIDTH = 375;
    const scale = width / BASE_WIDTH;
    const isMobile = width < height;
    const statusBarHeight = isMobile ? Math.round(24 * scale) : 0;
    
    const avatarSize = Math.round((exportConfig.styles?.avatarSize || 40) * scale);
    const fontSize = Math.round((exportConfig.styles?.fontSize || 16) * scale);
    const bubblePadding = Math.round((exportConfig.styles?.bubblePadding || 12) * scale);
    const bubbleRadius = Math.round((exportConfig.styles?.bubbleRadius || 18) * scale);
    const headerHeight = Math.round(avatarSize + 8 * scale);

    const layoutConfig: LayoutConfig = {
      ...DEFAULT_LAYOUT_CONFIG,
      width,
      height,
      headerHeight,
      statusBarHeight,
      avatarSize,
      fontSize,
      bubblePadding,
      bubbleRadius,
    };

    onProgress?.(5);

    const sequences = new Map<string, MessageTypingSequence>();
    if (config.enabled && !config.fastMode) {
      for (const msg of messages) {
        if (msg.type !== 'system') {
          sequences.set(msg.id, generateTypingSequence(msg, config));
        }
      }
    }

    const imageCache = new Map<string, HTMLImageElement>();
    const imageUrls = messages.filter(m => m.type === 'image' && m.image?.url).map(m => m.image!.url!);
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
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    let totalDuration = 0;
    for (const msg of messages) {
      if (sequences.has(msg.id)) {
        totalDuration += sequences.get(msg.id)!.totalDuration;
      } else {
        totalDuration += config.fastMode ? 100 : 800;
      }
      totalDuration += messageInterval;
    }
    totalDuration += 2000;

    const estimatedMs = estimateDuration(messages, config) * 1000;
    const speedMultiplier = calculateSpeedMultiplier(estimatedMs / 1000, config.targetDuration);
    const scaledDuration = totalDuration / speedMultiplier;
    const finalDuration = Math.max(scaledDuration, 5000);

    const totalFrames = Math.ceil(finalDuration / frameInterval);
    let frameIndex = 0;

    const visibleMessages: Message[] = [];
    const messageVisibleAt: Map<string, number> = new Map();
    let currentTypingIndex = 0;
    let typingElapsed = 0;

    for (let t = 0; t <= finalDuration; t += frameInterval) {
      if (currentTypingIndex < messages.length) {
        const currentMsg = messages[currentTypingIndex];

        if (currentTypingIndex >= visibleMessages.length) {
          visibleMessages.push(currentMsg);
          messageVisibleAt.set(currentMsg.id, t);
          typingElapsed = 0;
        } else {
          typingElapsed += frameInterval;
        }

        const scaledTypingElapsed = typingElapsed * speedMultiplier;

        if (sequences.has(currentMsg.id) && !config.fastMode) {
          const sequence = sequences.get(currentMsg.id)!;
          if (scaledTypingElapsed > sequence.totalDuration + messageInterval) {
            currentTypingIndex++;
          }
        } else {
          const msgDuration = config.fastMode ? 100 : 800;
          if (scaledTypingElapsed > msgDuration) {
            currentTypingIndex++;
          }
        }
      }

      ctx.fillStyle = darkMode ? '#1f1f1f' : (DEFAULT_EXPORT_STYLES.background || '#f5f5f5');
      ctx.fillRect(0, 0, width, height);

      // Draw status bar (mobile/portrait only)
      if (isMobile) {
        const showStatusBar = (DEFAULT_EXPORT_STYLES as any).showStatusBar !== false;
        if (showStatusBar) {
          const statusBg = darkMode ? '#1a1a1a' : ((DEFAULT_EXPORT_STYLES as any).statusBarBg || DEFAULT_EXPORT_STYLES.headerBg || '#f5f5f5');
          const statusColor = darkMode ? '#888' : ((DEFAULT_EXPORT_STYLES as any).statusBarColor || DEFAULT_EXPORT_STYLES.headerColor || '#1a1a1a');
          ctx.fillStyle = statusBg;
          ctx.fillRect(0, 0, width, statusBarHeight);

          const statusFontSize = Math.round(10 * scale);
          ctx.fillStyle = statusColor;
          ctx.font = `500 ${statusFontSize}px "Microsoft YaHei", sans-serif`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText('10:30', Math.round(8 * scale), statusBarHeight / 2);

          const signalX = width - Math.round(80 * scale);
          const signalY = statusBarHeight / 2;
          ctx.fillStyle = statusColor;
          for (let i = 0; i < 4; i++) {
            const barH = Math.round((12 - i * 2) * scale); // 12, 10, 8, 6 - tallest to shortest
            const barW = Math.round(3 * scale);
            const barGap = Math.round(5 * scale);
            ctx.fillRect(signalX + i * barGap, signalY - barH / 2, barW, barH);
          }

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

      ctx.fillStyle = darkMode ? '#2d2d2d' : (DEFAULT_EXPORT_STYLES.headerBg || '#f5f5f5');
      ctx.fillRect(0, statusBarHeight, width, headerHeight);

      ctx.fillStyle = darkMode ? '#ffffff' : (DEFAULT_EXPORT_STYLES.headerColor || '#1a1a1a');
      ctx.font = `bold ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Chat', width / 2, statusBarHeight + headerHeight / 2);
      ctx.textAlign = 'left';

      const typingProgress = new Map<string, { text: string; isTyping: boolean }>();
      
      for (let i = 0; i < visibleMessages.length; i++) {
        const msg = visibleMessages[i];
        const visibleTime = messageVisibleAt.get(msg.id) || 0;
        const elapsed = (t - visibleTime) * speedMultiplier;

        if (msg.type === 'system') {
          typingProgress.set(msg.id, { text: msg.content || '', isTyping: false });
        } else if (sequences.has(msg.id) && !config.fastMode) {
          const sequence = sequences.get(msg.id)!;
          const result = getVisibleContentAtTime(sequence, elapsed);
          typingProgress.set(msg.id, { text: result.text, isTyping: result.isTyping });
        } else {
          typingProgress.set(msg.id, { text: msg.content || '', isTyping: false });
        }
      }

      const { layouts, totalHeight } = calculateAllLayouts(ctx, visibleMessages, layoutConfig, typingProgress, currentTypingIndex, scale);
      const scrollOffset = calculateScrollOffset(layouts, totalHeight, layoutConfig, true);

      renderLayouts(ctx, layouts, typingProgress, scrollOffset, layoutConfig, darkMode, imageCache, config.cursorEnabled, config.cursorBlinkRate, t, scale);

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
      '-y',
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

export const loopTypingRenderer = new LoopTypingRenderer();
