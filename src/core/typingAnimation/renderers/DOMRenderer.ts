import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import html2canvas from 'html2canvas';
import type { Message, UserProfile } from '@/types';
import type { TypingAnimationConfig, ExportConfig } from '../types';
import { estimateDuration, calculateSpeedMultiplier } from '../generators';

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
  private container: HTMLDivElement | null = null;
  private imageCache: Map<string, HTMLImageElement> = new Map();

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

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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

  private createAvatarHtml(name: string, avatarSize: number): string {
    const color = this.getAvatarColor(name);
    const initials = this.getInitials(name);
    const fontSize = Math.round(avatarSize * 0.38);
    
    return `
      <div style="
        width: ${avatarSize}px;
        height: ${avatarSize}px;
        border-radius: 50%;
        background: ${color};
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${fontSize}px;
        flex-shrink: 0;
        font-family: Arial, sans-serif;
      ">${initials}</div>
    `;
  }

  private createTextBubbleHtml(
    content: string,
    isUser: boolean,
    darkMode: boolean,
    styles: any
  ): string {
    const bg = isUser
      ? (darkMode ? '#128400' : styles.bubbleRightBg || '#95ec69')
      : (darkMode ? '#2d2d2d' : styles.bubbleLeftBg || '#ffffff');
    const color = isUser
      ? '#ffffff'
      : (darkMode ? '#ffffff' : styles.bubbleLeftColor || '#333');
    const text = this.escapeHtml(content);

    return `
      <div style="
        background: ${bg};
        color: ${color};
        padding: 10px 14px;
        border-radius: 12px;
        font-size: ${styles.fontSize || 16}px;
        line-height: 1.5;
        max-width: 100%;
        word-break: break-word;
        display: inline-block;
      ">${text}</div>
    `;
  }

  private createRedPacketHtml(msg: Message, _isUser: boolean): string {
    const amount = ((msg.redPacket?.amount || 0) / 100).toFixed(2);
    const greeting = this.escapeHtml(msg.redPacket?.greeting || '恭喜发财，大吉大利');
    const isOpened = msg.redPacket?.isOpened || false;

    return `
      <div style="
        background: #fff;
        border-radius: 10px;
        width: 200px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        font-family: 'Microsoft YaHei', sans-serif;
      ">
        <div style="
          background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
          padding: 12px;
        ">
          <div style="display: flex; align-items: center;">
            <div style="
              width: 48px;
              height: 48px;
              background: #ffd700;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-right: 12px;
            ">
              <span style="font-size: 24px;">🧧</span>
            </div>
            <div style="color: white;">
              <div style="font-weight: bold; font-size: 16px;">微信红包</div>
              <div style="font-size: 14px; opacity: 0.9; margin-top: 2px;">${greeting}</div>
            </div>
          </div>
        </div>
        <div style="
          background: #f8f8f8;
          padding: 8px 12px;
          text-align: center;
          border-top: 1px solid #eee;
        ">
          <div style="
            font-size: 12px;
            color: ${isOpened ? '#e74c3c' : '#666'};
          ">${isOpened ? `已领取 ¥${amount}` : '领取红包'}</div>
        </div>
      </div>
    `;
  }

  private createTransferHtml(msg: Message, _isUser: boolean): string {
    const amount = ((msg.transfer?.amount || 0) / 100).toFixed(2);
    const isReceived = msg.transfer?.isReceived || false;

    return `
      <div style="
        background: #fff;
        border-radius: 10px;
        width: 200px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        font-family: 'Microsoft YaHei', sans-serif;
        border: 1px solid #e0e0e0;
      ">
        <div style="
          background: #f5f5f5;
          padding: 12px;
        ">
          <div style="display: flex; align-items: center;">
            <div style="
              width: 44px;
              height: 44px;
              background: #07c160;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-right: 12px;
            ">
              <span style="color: white; font-size: 20px; font-weight: bold;">¥</span>
            </div>
            <div style="color: #333;">
              <div style="font-weight: 500; font-size: 14px;">转账</div>
              <div style="font-weight: bold; font-size: 20px; margin-top: 2px;">¥${amount}</div>
            </div>
          </div>
        </div>
        <div style="
          background: #f8f8f8;
          padding: 8px 12px;
          text-align: center;
          border-top: 1px solid #e0e0e0;
        ">
          <div style="
            font-size: 12px;
            color: ${isReceived ? '#07c160' : '#999'};
          ">${isReceived ? '已收款' : '待收款'}</div>
        </div>
      </div>
    `;
  }

  private createImageHtml(msg: Message, imageCache: Map<string, HTMLImageElement>): string {
    const caption = this.escapeHtml(msg.image?.caption || '');
    const imageUrl = msg.image?.url || '';

    if (imageUrl && imageCache.has(imageUrl)) {
      return `
        <div style="
          border-radius: 12px;
          overflow: hidden;
          position: relative;
          max-width: 180px;
        ">
          <img 
            src="${imageUrl}" 
            style="
              width: 180px;
              height: 180px;
              object-fit: cover;
              display: block;
            "
          />
          ${caption ? `
            <div style="
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              background: rgba(0,0,0,0.6);
              color: white;
              padding: 4px 8px;
              font-size: 12px;
              text-align: center;
            ">${caption}</div>
          ` : ''}
        </div>
      `;
    }

    return `
      <div style="
        background: #e0e0e0;
        border-radius: 12px;
        width: 180px;
        height: 180px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 48px;
        position: relative;
      ">📷</div>
    `;
  }

  private createVoiceHtml(msg: Message, isUser: boolean, darkMode: boolean, styles: any): string {
    const bg = isUser
      ? (darkMode ? '#128400' : styles.bubbleRightBg || '#95ec69')
      : (darkMode ? '#2d2d2d' : styles.bubbleLeftBg || '#ffffff');
    const color = isUser ? '#ffffff' : '#333';
    const duration = msg.voice?.duration || 0;
    const text = this.escapeHtml(msg.voice?.text || '');
    const bubbleWidth = Math.max(120, 60 + duration * 8);

    const waveBars = [0,1,2,3,4,5,6,7].map(i => {
      const h = 8 + Math.sin(i * 0.8) * 6;
      return `<div style="width:3px;height:${h}px;background:${color};opacity:0.6;border-radius:1px;"></div>`;
    }).join('');

    return `
      <div style="
        background: ${bg};
        border-radius: 12px;
        padding: 8px 12px;
        display: flex;
        align-items: center;
        min-width: ${bubbleWidth}px;
        max-width: ${bubbleWidth}px;
      ">
        <div style="
          width: 0;
          height: 0;
          border-top: 6px solid transparent;
          border-bottom: 6px solid transparent;
          ${isUser ? `border-left` : `border-right`}: 8px solid ${color};
          margin-right: 8px;
        "></div>
        <div style="display:flex;align-items:center;gap:3px;">${waveBars}</div>
        <span style="margin-left:8px;font-size:12px;opacity:0.7;color:${color};">${duration}"</span>
      </div>
      ${text ? `<div style="margin-top:4px;font-size:14px;color:${darkMode ? '#aaa' : '#666'};padding-left:4px;">${text}</div>` : ''}
    `;
  }

  private createMessageHtml(
    msg: Message,
    isUser: boolean,
    darkMode: boolean,
    styles: any,
    imageCache: Map<string, HTMLImageElement>
  ): string {
    const avatarSize = styles.avatarSize || 40;
    const gap = 8;

    if (msg.type === 'system') {
      const systemText = this.escapeHtml(msg.system?.text || msg.content || '');
      return `
        <div style="
          text-align: center;
          margin: 8px 0;
        ">
          <span style="
            background: ${darkMode ? '#333' : '#f0f0f0'};
            color: ${darkMode ? '#888' : '#888'};
            font-size: 12px;
            padding: 4px 12px;
            border-radius: 10px;
            display: inline-block;
          ">${systemText}</span>
        </div>
      `;
    }

    let contentHtml = '';

    if (msg.type === 'redpacket') {
      contentHtml = this.createRedPacketHtml(msg, isUser);
    } else if (msg.type === 'transfer') {
      contentHtml = this.createTransferHtml(msg, isUser);
    } else if (msg.type === 'image') {
      contentHtml = this.createImageHtml(msg, imageCache);
    } else if (msg.type === 'voice') {
      contentHtml = this.createVoiceHtml(msg, isUser, darkMode, styles);
    } else {
      contentHtml = this.createTextBubbleHtml(msg.content || '', isUser, darkMode, styles);
    }

    return `
      <div style="
        display: flex;
        flex-direction: ${isUser ? 'row-reverse' : 'row'};
        align-items: flex-start;
        margin-bottom: ${gap}px;
        padding: 0 4px;
      ">
        ${this.createAvatarHtml(msg.sender, avatarSize)}
        <div style="
          margin-left: ${isUser ? 0 : gap}px;
          margin-right: ${isUser ? gap : 0}px;
          max-width: 70%;
        ">
          <div style="
            font-size: 12px;
            color: #888;
            margin-bottom: 4px;
            ${isUser ? 'text-align: right;' : ''}
          ">${msg.sender}</div>
          ${contentHtml}
        </div>
      </div>
    `;
  }

  private updateDOMContent(
    messages: Message[],
    darkMode: boolean,
    styles: any,
    imageCache: Map<string, HTMLImageElement>
  ) {
    if (!this.container) return;

    const avatarSize = styles.avatarSize || 40;
    const fontSize = styles.fontSize || 16;
    const headerHeight = avatarSize + 8;
    const width = styles.width;
    const height = styles.height;

    const headerBg = darkMode ? '#2d2d2d' : (styles.headerBg || '#f5f5f5');
    const headerColor = darkMode ? '#ffffff' : (styles.headerColor || '#1a1a1a');
    const contentBg = darkMode ? '#1f1f1f' : (styles.background || '#f5f5f5');

    let messagesHtml = '';
    for (const msg of messages) {
      const isUser = msg.role === 'user';
      messagesHtml += this.createMessageHtml(msg, isUser, darkMode, styles, imageCache);
    }

    this.container.innerHTML = `
      <div style="
        width: ${width}px;
        height: ${height}px;
        background: ${contentBg};
        font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
        overflow: hidden;
        position: relative;
      ">
        <div style="
          height: ${headerHeight}px;
          background: ${headerBg};
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${headerColor};
          font-size: ${fontSize}px;
          font-weight: bold;
          flex-shrink: 0;
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
          overflow-y: auto;
        ">
          ${messagesHtml}
        </div>
      </div>
    `;
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
    const styles = { ...exportConfig.styles, width, height };

    onProgress?.(5);

    await document.fonts.ready;
    onProgress?.(10);

    this.imageCache.clear();
    const imageUrls = messages.filter(m => m.type === 'image' && m.image?.url).map(m => m.image!.url!);
    for (const url of imageUrls) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      this.imageCache.set(url, img);
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    }

    if (!this.container) {
      this.container = document.createElement('div');
      this.container.style.position = 'absolute';
      this.container.style.left = '-9999px';
      this.container.style.top = '0';
      this.container.style.zIndex = '-1';
      document.body.appendChild(this.container);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    let totalDuration = 0;
    for (const msg of messages) {
      if (msg.type === 'system') {
        totalDuration += 500;
      } else if (msg.type === 'image' || msg.type === 'voice' || msg.type === 'redpacket' || msg.type === 'transfer') {
        totalDuration += 1000;
      } else {
        totalDuration += config.fastMode ? 100 : config.baseSpeed * (msg.content?.length || 10);
      }
      totalDuration += messageInterval;
    }
    totalDuration += 2000;

    const estimatedMs = estimateDuration(messages, config) * 1000;
    const speedMultiplier = calculateSpeedMultiplier(estimatedMs / 1000, config.targetDuration);
    const finalDuration = Math.max(totalDuration / speedMultiplier, 5000);

    const totalFrames = Math.ceil(finalDuration / frameInterval);
    let frameIndex = 0;

    const visibleMessages: Message[] = [];
    let currentMsgIndex = 0;
    let msgAppearTime = 0;

    for (let t = 0; t <= finalDuration; t += frameInterval) {
      if (currentMsgIndex < messages.length) {
        if (t >= msgAppearTime) {
          visibleMessages.push(messages[currentMsgIndex]);
          
          const msg = messages[currentMsgIndex];
          let msgDuration = config.fastMode ? 100 : 800;
          if (msg.type === 'system') msgDuration = 500;
          else if (msg.type === 'image' || msg.type === 'voice' || msg.type === 'redpacket' || msg.type === 'transfer') msgDuration = 1000;
          else msgDuration = config.baseSpeed * (msg.content?.length || 10);
          
          currentMsgIndex++;
          msgAppearTime += msgDuration / speedMultiplier + messageInterval / speedMultiplier;
        }
      }

      this.updateDOMContent(visibleMessages, darkMode, styles, this.imageCache);

      try {
        const htmlCanvas = await html2canvas(this.container.firstElementChild as HTMLElement, {
          backgroundColor: darkMode ? '#1f1f1f' : '#f5f5f5',
          scale: 1,
          logging: false,
          useCORS: true,
          allowTaint: false,
        });

        ctx.drawImage(htmlCanvas, 0, 0, width, height);
      } catch (err) {
        console.error('html2canvas error:', err);
        ctx.fillStyle = darkMode ? '#1f1f1f' : '#f5f5f5';
        ctx.fillRect(0, 0, width, height);
      }

      await new Promise(resolve => setTimeout(resolve, 5));

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
