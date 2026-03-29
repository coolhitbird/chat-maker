import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import type { Message, UserProfile } from '@/types';
import type { TypingAnimationConfig, ExportConfig } from '../types';
import { estimateDuration } from '../generators';

interface TypingRenderer {
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

export class DOMTypingRenderer implements TypingRenderer {
  private ffmpeg: FFmpeg | null = null;
  private loaded: boolean = false;

  async init(): Promise<void> {
    if (this.loaded) return;

    this.ffmpeg = new FFmpeg();

    this.ffmpeg.on('log', ({ message }) => {
      console.log('[DOMRenderer FFmpeg]', message);
    });

    this.ffmpeg.on('progress', ({ progress }) => {
      console.log('[DOMRenderer Progress]', Math.round(progress * 100), '%');
    });

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    this.loaded = true;
  }

  private createDOMSnapshot(
    messages: Message[],
    _container: HTMLElement,
    darkMode: boolean,
    styles: any
  ): string {
    const avatarSize = styles.avatarSize || 40;
    const fontSize = styles.fontSize || 16;
    const gap = 8;
    const headerHeight = avatarSize + 8;

    let html = `
      <div style="
        width: ${styles.width}px;
        height: ${styles.height}px;
        background: ${darkMode ? '#1f1f1f' : styles.background};
        font-family: ${styles.fontFamily || 'Microsoft YaHei, PingFang SC, sans-serif'};
        overflow: hidden;
        position: relative;
      ">
        <div style="
          height: ${headerHeight}px;
          background: ${darkMode ? '#2d2d2d' : styles.headerBg};
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${darkMode ? '#ffffff' : styles.headerColor};
          font-size: ${fontSize}px;
          font-weight: bold;
        ">
          Chat
        </div>
        <div style="
          padding: 10px;
          position: absolute;
          top: ${headerHeight}px;
          left: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
        ">
    `;

    for (const msg of messages) {
      if (msg.type === 'system') {
        const systemText = msg.system?.text || msg.content || '';
        html += `
          <div style="
            text-align: center;
            margin: 10px 0;
          ">
            <span style="
              background: ${darkMode ? '#333' : '#f0f0f0'};
              color: ${darkMode ? '#888' : '#888'};
              font-size: ${fontSize * 0.9}px;
              padding: 4px 12px;
              border-radius: 12px;
              display: inline-block;
            ">${systemText}</span>
          </div>
        `;
        continue;
      }

      const isUser = msg.role === 'user';
      const bg = isUser
        ? (darkMode ? '#128400' : styles.bubbleRightBg)
        : (darkMode ? '#2d2d2d' : styles.bubbleLeftBg);
      const color = darkMode ? '#ffffff' : styles.bubbleLeftColor;

      html += `
        <div style="
          display: flex;
          flex-direction: ${isUser ? 'row-reverse' : 'row'};
          align-items: flex-start;
          margin-bottom: ${gap}px;
          animation: fadeIn 0.3s ease-out;
        ">
          <div style="
            width: ${avatarSize}px;
            height: ${avatarSize}px;
            border-radius: 50%;
            background: ${this.getAvatarColor(msg.sender)};
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: ${fontSize * 0.4}px;
            flex-shrink: 0;
          ">${this.getInitials(msg.sender)}</div>
          <div style="
            max-width: 65%;
            margin-left: ${isUser ? 0 : gap}px;
            margin-right: ${isUser ? gap : 0}px;
          ">
            <div style="
              background: ${bg};
              color: ${color};
              padding: 8px 12px;
              border-radius: 12px;
              font-size: ${fontSize}px;
              line-height: 1.4;
              word-break: break-word;
            ">${msg.content}</div>
          </div>
        </div>
      `;
    }

    html += `
        </div>
        <style>
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        </style>
      </div>
    `;

    return html;
  }

  private getInitials(name: string): string {
    if (!name) return '?';
    if (name.length === 1) return name.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  private getAvatarColor(name: string): string {
    const colors = [
      '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
      '#f43f5e', '#ef4444', '#f97316', '#eab308', '#22c55e',
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
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

    const width = exportConfig.width;
    const height = exportConfig.height;
    const styles = { ...exportConfig.styles, width, height };

    onProgress?.(5);

    await document.fonts.ready;
    onProgress?.(10);

    const dpr = 2;
    const canvas = document.createElement('canvas');
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const charDurations = messages.map(msg => {
      if (msg.type === 'system') return 0;
      const content = msg.content || '';
      return config.fastMode ? 100 : config.baseSpeed * content.length;
    });

    const totalDuration = estimateDuration(messages, config) * 1000 + 1000;
    const totalFrames = Math.ceil(totalDuration / frameInterval);
    let frameIndex = 0;

    const visibleMessages: Message[] = [];
    let currentMsgIndex = 0;
    let msgAppearTime = 0;

    const messageInterval = config.fastMode ? 200 : 1500;

    for (let t = 0; t <= totalDuration; t += frameInterval) {
      if (currentMsgIndex < messages.length) {
        if (t >= msgAppearTime) {
          visibleMessages.push(messages[currentMsgIndex]);
          currentMsgIndex++;
          msgAppearTime += charDurations[currentMsgIndex - 1] + messageInterval;
        }
      }

      const html = this.createDOMSnapshot(visibleMessages, document.body, darkMode, styles);

      const img = new Image();
      const svgBlob = new Blob([html], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);

      await new Promise<void>((resolve) => {
        img.onload = () => {
          ctx.fillStyle = darkMode ? '#1f1f1f' : '#f5f5f5';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        img.src = url;
      });

      await new Promise(resolve => setTimeout(resolve, 10));

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

export const domTypingRenderer = new DOMTypingRenderer();
