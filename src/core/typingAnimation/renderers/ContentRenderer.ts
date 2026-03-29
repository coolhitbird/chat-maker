import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import type { Message, UserProfile } from '@/types';
import type { TypingAnimationConfig, ExportConfig, MessageTypingSequence } from '../types';
import { generateTypingSequence, getVisibleContentAtTime, estimateDuration } from '../generators';
import {
  TypingRenderer,
  drawTypingAvatar,
  drawTypingBubble,
  drawTypingText,
  drawTypingCursor,
  MessageRenderData
} from './base';

export class ContentTypingRenderer implements TypingRenderer {
  private ffmpeg: FFmpeg | null = null;
  private loaded: boolean = false;

  async init(): Promise<void> {
    if (this.loaded) return;

    this.ffmpeg = new FFmpeg();

    this.ffmpeg.on('log', ({ message }) => {
      console.log('[ContentRenderer FFmpeg]', message);
    });

    this.ffmpeg.on('progress', ({ progress }) => {
      console.log('[ContentRenderer Progress]', Math.round(progress * 100), '%');
    });

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    this.loaded = true;
  }

  private calculateLayout(
    ctx: CanvasRenderingContext2D,
    messages: Message[],
    sequences: Map<string, MessageTypingSequence>,
    elapsedTime: number,
    width: number,
    avatarSize: number,
    fontSize: number,
    bubblePadding: number,
    gap: number,
    headerHeight: number
  ): { renderData: MessageRenderData[]; totalHeight: number } {
    const renderData: MessageRenderData[] = [];
    const maxBubbleWidth = width * 0.65;
    const lineHeight = fontSize * 1.4;
    const senderHeight = avatarSize * 0.33;

    let totalHeight = headerHeight + 10;

    for (const msg of messages) {
      if (msg.type === 'system') {
        const blockHeight = 28 + gap;
        totalHeight += blockHeight;
        renderData.push({
          msg,
          visibleContent: msg.content || '',
          isTyping: false,
          bubbleWidth: 0,
          bubbleHeight: 0,
          totalHeight: blockHeight,
        });
        continue;
      }

      let visibleContent = msg.content || '';
      let isTyping = false;

      const sequence = sequences.get(msg.id);
      if (sequence && elapsedTime >= 0) {
        const result = getVisibleContentAtTime(sequence, elapsedTime);
        visibleContent = result.text;
        isTyping = result.isTyping;
      }

      const textResult = drawTypingText(
        ctx,
        visibleContent,
        0, 0,
        maxBubbleWidth - bubblePadding * 2,
        fontSize,
        '#000',
        lineHeight
      );

      const bubbleHeight = textResult.height + bubblePadding * 2;
      const bubbleWidth = Math.min(textResult.width + bubblePadding * 2, maxBubbleWidth);
      const blockHeight = Math.max(avatarSize, bubbleHeight + senderHeight) + gap;

      totalHeight += blockHeight;

      renderData.push({
        msg,
        visibleContent,
        isTyping,
        bubbleWidth,
        bubbleHeight,
        totalHeight: blockHeight,
      });
    }

    return { renderData, totalHeight };
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

    const styles = { ...exportConfig.styles };
    const avatarSize = styles.avatarSize || 40;
    const fontSize = styles.fontSize || 16;
    const bubblePadding = styles.bubblePadding || 12;
    const bubbleRadius = styles.bubbleRadius || 18;
    const gap = 8;
    const headerHeight = avatarSize + 8;

    const width = exportConfig.width;
    const height = exportConfig.height;

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
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    let frameIndex = 0;
    const visibleMessages: Message[] = [];
    let currentTypingIndex = 0;
    let typingElapsed = 0;

    const totalDuration = estimateDuration(messages, config) * 1000 + 1000;
    const totalFrames = Math.ceil(totalDuration / frameInterval);

    for (let t = 0; t <= totalDuration; t += frameInterval) {
      if (currentTypingIndex < messages.length) {
        const currentMsg = messages[currentTypingIndex];

        if (currentTypingIndex >= visibleMessages.length) {
          visibleMessages.push(currentMsg);
          typingElapsed = 0;
        } else {
          typingElapsed += frameInterval;
        }

        if (sequences.has(currentMsg.id) && !config.fastMode) {
          const seq = sequences.get(currentMsg.id)!;
          
          if (typingElapsed > seq.totalDuration + messageInterval) {
            currentTypingIndex++;
          }
        } else {
          if (typingElapsed > (config.fastMode ? 100 : 800)) {
            currentTypingIndex++;
          }
        }
      }

      ctx.fillStyle = darkMode ? '#1f1f1f' : (styles.background || '#f5f5f5');
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = darkMode ? '#2d2d2d' : (styles.headerBg || '#f5f5f5');
      ctx.fillRect(0, 0, width, headerHeight);

      ctx.fillStyle = darkMode ? '#ffffff' : (styles.headerColor || '#1a1a1a');
      ctx.font = `bold ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(styles.headerColor || 'Chat', width / 2, headerHeight / 2);
      ctx.textAlign = 'left';

      const contentHeight = height - headerHeight;
      const { renderData, totalHeight } = this.calculateLayout(
        ctx,
        visibleMessages,
        sequences,
        typingElapsed,
        width,
        avatarSize,
        fontSize,
        bubblePadding,
        gap,
        headerHeight
      );

      let scrollOffset = 0;
      if (totalHeight > contentHeight) {
        scrollOffset = totalHeight - contentHeight;
      }

      const lineHeight = fontSize * 1.4;
      let y = headerHeight + 10 - scrollOffset;

      for (const data of renderData) {
        const msg = data.msg;

        if (y < headerHeight - 20 || y > height + 20) {
          continue;
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

        const isUser = msg.role === 'user';
        const avatarX = isUser ? width - 10 - avatarSize : 10;

        drawTypingAvatar(ctx, avatarX, y, avatarSize, msg.sender);

        const bubbleX = isUser ? avatarX - gap - data.bubbleWidth : avatarX + avatarSize + gap;
        const bubbleY = y + (avatarSize * 0.33);

        drawTypingBubble(
          ctx,
          bubbleX,
          bubbleY,
          data.bubbleWidth,
          data.bubbleHeight,
          bubbleRadius,
          isUser,
          styles as any,
          darkMode
        );

        const textColor = darkMode
          ? '#ffffff'
          : (isUser ? (styles.bubbleRightColor || '#1a1a1a') : (styles.bubbleLeftColor || '#1a1a1a'));

        drawTypingText(
          ctx,
          data.visibleContent,
          bubbleX + bubblePadding,
          bubbleY + bubblePadding,
          data.bubbleWidth - bubblePadding * 2,
          fontSize,
          textColor,
          lineHeight
        );

        if (data.isTyping && config.cursorEnabled) {
          const lastLineWidth = ctx.measureText(data.visibleContent).width;
          const cursorX = bubbleX + bubblePadding + Math.min(lastLineWidth, data.bubbleWidth - bubblePadding * 2);
          const cursorY = bubbleY + bubblePadding;
          drawTypingCursor(ctx, cursorX, cursorY, fontSize, config.cursorBlinkRate, t);
        }

        y += data.totalHeight;
      }

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

export const contentTypingRenderer = new ContentTypingRenderer();
