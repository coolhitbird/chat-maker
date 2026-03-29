import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import type { Message, UserProfile } from '@/types';
import type { TypingAnimationConfig, ExportConfig, MessageTypingSequence } from '../types';
import { generateTypingSequence, estimateDuration } from '../generators';
import { DEFAULT_EXPORT_STYLES } from '../types';

export interface MessageTiming {
  messageId: string;
  appearTime: number;
  typingStartTime: number;
  typingEndTime: number;
  endTime: number;
}

export interface RenderState {
  visibleMessages: Message[];
  typingProgress: Map<string, { text: string; isTyping: boolean }>;
  scrollOffset: number;
}

function calculateMessageTimings(
  messages: Message[],
  config: TypingAnimationConfig,
  messageInterval: number = 1500
): MessageTiming[] {
  const timings: MessageTiming[] = [];
  let currentTime = 0;

  for (const msg of messages) {
    const appearTime = currentTime;
    
    if (msg.type === 'system') {
      timings.push({
        messageId: msg.id,
        appearTime,
        typingStartTime: appearTime,
        typingEndTime: appearTime + 200,
        endTime: appearTime + 800,
      });
      currentTime = appearTime + 800;
    } else {
      const typingDuration = config.fastMode ? 100 : config.baseSpeed * (msg.content?.length || 10);
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

  return timings;
}

function calculateMessageHeight(content: string, maxWidth: number, fontSize: number, padding: number): number {
  const charWidth = fontSize;
  const charsPerLine = Math.floor((maxWidth - padding * 2) / charWidth);
  const lines = Math.ceil(content.length / charsPerLine);
  return 40 + lines * (fontSize * 1.5) + padding * 2;
}

function getRenderState(
  elapsedTime: number,
  messages: Message[],
  timings: MessageTiming[],
  sequences: Map<string, MessageTypingSequence>,
  config: TypingAnimationConfig,
  contentHeight: number,
  headerHeight: number
): RenderState {
  const visibleMessages: Message[] = [];
  const typingProgress = new Map<string, { text: string; isTyping: boolean }>();
  
  const maxBubbleWidth = 350;
  
  let totalHeight = headerHeight + 20;
  const messageHeights: number[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const timing = timings[i];
    
    if (!timing || elapsedTime < timing.appearTime) {
      messageHeights.push(0);
      continue;
    }

    visibleMessages.push(msg);
    
    const content = msg.content || '';
    const height = calculateMessageHeight(content, maxBubbleWidth, 16, 12);
    messageHeights.push(height);
    totalHeight += height + 10;

    if (msg.type === 'system') {
      typingProgress.set(msg.id, { text: content, isTyping: false });
    } else {
      const sequence = sequences.get(msg.id);
      if (sequence && !config.fastMode && elapsedTime >= timing.typingStartTime && elapsedTime < timing.typingEndTime) {
        const typingElapsed = elapsedTime - timing.typingStartTime;
        let text = '';
        let isTyping = true;
        
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
        
        isTyping = elapsedTime < timing.typingEndTime - 50;
        typingProgress.set(msg.id, { text, isTyping });
      } else {
        typingProgress.set(msg.id, { text: content, isTyping: false });
      }
    }
  }

  const scrollThreshold = contentHeight - 100;
  let scrollOffset = 0;
  
  if (totalHeight > scrollThreshold && visibleMessages.length > 0) {
    const lastMsgIndex = visibleMessages.length - 1;
    let heightBeforeLast = headerHeight + 20;
    for (let i = 0; i < lastMsgIndex; i++) {
      heightBeforeLast += messageHeights[i] + 10;
    }
    
    const lastMsgHeight = messageHeights[lastMsgIndex] || 60;
    const targetBottom = scrollThreshold - 20;
    const actualBottom = heightBeforeLast + lastMsgHeight;
    scrollOffset = Math.max(0, actualBottom - targetBottom);
  }

  return {
    visibleMessages,
    typingProgress,
    scrollOffset,
  };
}

function renderFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  messages: Message[],
  renderState: RenderState,
  darkMode: boolean,
  _config: TypingAnimationConfig,
  _elapsedTime: number
): void {
  const styles = DEFAULT_EXPORT_STYLES;
  const headerHeight = styles.avatarSize + 8;
  const avatarSize = styles.avatarSize;
  const fontSize = styles.fontSize;
  const bubblePadding = styles.bubblePadding;
  const bubbleRadius = styles.bubbleRadius;
  const gap = 10;
  const contentHeight = height - headerHeight;

  ctx.fillStyle = darkMode ? '#1f1f1f' : styles.background;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = darkMode ? '#2d2d2d' : styles.headerBg;
  ctx.fillRect(0, 0, width, headerHeight);

  ctx.fillStyle = darkMode ? '#ffffff' : styles.headerColor;
  ctx.font = `bold ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Chat', width / 2, headerHeight / 2);
  ctx.textAlign = 'left';

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, headerHeight, width, contentHeight);
  ctx.clip();

  ctx.fillStyle = darkMode ? '#333' : '#e5e5e5';
  ctx.fillRect(0, headerHeight, width, contentHeight);

  const startY = contentHeight - 20;
  let y = startY;

  for (let i = renderState.visibleMessages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const state = renderState.typingProgress.get(msg.id);
    
    if (!state) continue;

    const content = state.text;
    const isUser = msg.role === 'user';
    const maxBubbleWidth = width * 0.6;
    
    ctx.font = `${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
    const textWidth = ctx.measureText(content).width || 10;
    const bubbleWidth = Math.min(textWidth + bubblePadding * 2, maxBubbleWidth);
    
    const lineHeight = fontSize * 1.5;
    const lines = Math.ceil(textWidth / (bubbleWidth - bubblePadding * 2));
    const textHeight = lines * lineHeight;
    const bubbleHeight = Math.max(lineHeight + bubblePadding, textHeight + bubblePadding * 2);

    const senderHeight = avatarSize * 0.4;
    const totalBlockHeight = Math.max(avatarSize, bubbleHeight + senderHeight) + gap;
    y -= totalBlockHeight;

    if (y < headerHeight - 20) break;

    const avatarX = isUser ? width - 10 - avatarSize : 10;
    
    ctx.fillStyle = getAvatarColor(msg.sender);
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, y + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${avatarSize * 0.4}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(getInitials(msg.sender), avatarX + avatarSize / 2, y + avatarSize / 2);
    ctx.textAlign = 'left';

    const bubbleX = isUser ? avatarX - gap - bubbleWidth : avatarX + avatarSize + gap;
    const bubbleY = y + senderHeight;

    ctx.fillStyle = isUser ? styles.bubbleRightBg : styles.bubbleLeftBg;
    ctx.beginPath();
    ctx.moveTo(bubbleX + bubbleRadius, bubbleY);
    ctx.lineTo(bubbleX + bubbleWidth - bubbleRadius, bubbleY);
    ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + bubbleRadius);
    ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - bubbleRadius);
    ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - bubbleRadius, bubbleY + bubbleHeight);
    ctx.lineTo(bubbleX + bubbleRadius, bubbleY + bubbleHeight);
    ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - bubbleRadius);
    ctx.lineTo(bubbleX, bubbleY + bubbleRadius);
    ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + bubbleRadius, bubbleY);
    ctx.closePath();
    ctx.fill();

    const textX = bubbleX + bubblePadding;
    const textMaxWidth = bubbleWidth - bubblePadding * 2;
    const textY = bubbleY + (bubbleHeight - textHeight) / 2;

    ctx.fillStyle = darkMode ? '#ffffff' : (isUser ? styles.bubbleRightColor : styles.bubbleLeftColor);
    ctx.font = `${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
    ctx.textBaseline = 'top';

    let currentX = textX;
    let currentY = textY;
    let lineCharCount = 0;
    
    for (const char of content) {
      const charWidth = ctx.measureText(char).width;
      
      if (lineCharCount > 0 && (currentX - textX + charWidth) > textMaxWidth) {
        currentX = textX;
        currentY += lineHeight;
        lineCharCount = 0;
      }
      
      ctx.fillText(char, currentX, currentY);
      currentX += charWidth;
      lineCharCount++;
    }
  }

  ctx.restore();
}

function getInitials(name: string): string {
  if (!name) return '?';
  if (name.length === 1) return name.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316', '#eab308', '#22c55e',
];

function getAvatarColor(name: string): string {
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
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
    if (config.enabled && !config.fastMode) {
      for (const msg of messages) {
        if (msg.type !== 'system') {
          sequences.set(msg.id, generateTypingSequence(msg, config));
        }
      }
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

    const timings = calculateMessageTimings(messages, config, messageInterval);
    let totalDuration = 0;
    for (const t of timings) {
      totalDuration = Math.max(totalDuration, t.endTime);
    }
    totalDuration += 1000;

    const headerHeight = DEFAULT_EXPORT_STYLES.avatarSize + 8;
    const contentHeight = height - headerHeight;

    const totalFrames = Math.ceil(totalDuration / frameInterval);
    let frameIndex = 0;

    for (let t = 0; t <= totalDuration; t += frameInterval) {
      const renderState = getRenderState(
        t,
        messages,
        timings,
        sequences,
        config,
        contentHeight,
        headerHeight
      );

      const exportConfigNoCursor: TypingAnimationConfig = {
        ...config,
        cursorEnabled: false,
      };

      renderFrame(ctx, width, height, messages, renderState, darkMode, exportConfigNoCursor, t);

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
