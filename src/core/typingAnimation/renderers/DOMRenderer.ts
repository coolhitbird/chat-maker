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
    styles: any,
    scale: number = 1
  ): string {
    const bg = isUser
      ? (darkMode ? '#128400' : styles.bubbleRightBg || '#95ec69')
      : (darkMode ? '#2d2d2d' : styles.bubbleLeftBg || '#ffffff');
    const color = isUser
      ? '#ffffff'
      : (darkMode ? '#ffffff' : styles.bubbleLeftColor || '#333');
    const text = this.escapeHtml(content);
    const paddingH = Math.round(12 * scale);
    const paddingV = Math.round(10 * scale);
    const borderRadius = Math.round(18 * scale);
    const fontSize = Math.round((styles.fontSize || 16) * scale);

    return `
      <div style="
        background: ${bg};
        color: ${color};
        padding: ${paddingV}px ${paddingH}px;
        border-radius: ${borderRadius}px;
        font-size: ${fontSize}px;
        line-height: 1.4;
        max-width: 100%;
        word-break: break-word;
        display: inline-block;
      ">${text}</div>
    `;
  }

  private createRedPacketHtml(msg: Message, _isUser: boolean, scale: number = 1): string {
    const amount = ((msg.redPacket?.amount || 0) / 100).toFixed(2);
    const greeting = this.escapeHtml(msg.redPacket?.greeting || '恭喜发财，大吉大利');
    const isOpened = msg.redPacket?.isOpened || false;

    const w = Math.round(180 * scale);
    const iconSize = Math.round(48 * scale);
    const iconFontSize = Math.round(24 * scale);
    const gap = Math.round(12 * scale);
    const headerPadding = Math.round(12 * scale);
    const footerPadding = Math.round(8 * scale);
    const titleFontSize = Math.round(16 * scale);
    const greetingFontSize = Math.round(14 * scale);
    const footerFontSize = Math.round(12 * scale);

    return `
      <div style="
        background: #fff;
        border-radius: ${Math.round(10 * scale)}px;
        width: ${w}px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        font-family: 'Microsoft YaHei', sans-serif;
      ">
        <div style="
          background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
          padding: ${headerPadding}px;
        ">
          <div style="display: flex; align-items: center;">
            <div style="
              width: ${iconSize}px;
              height: ${iconSize}px;
              background: #ffd700;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-right: ${gap}px;
              font-size: ${iconFontSize}px;
            ">🧧</div>
            <div style="color: white;">
              <div style="font-weight: bold; font-size: ${titleFontSize}px;">微信红包</div>
              <div style="font-size: ${greetingFontSize}px; opacity: 0.9; margin-top: 2px;">${greeting}</div>
            </div>
          </div>
        </div>
        <div style="
          background: #f8f8f8;
          padding: ${footerPadding}px ${headerPadding}px;
          text-align: center;
          border-top: 1px solid #eee;
        ">
          <div style="
            font-size: ${footerFontSize}px;
            color: ${isOpened ? '#e74c3c' : '#666'};
          ">${isOpened ? `已领取 ¥${amount}` : '领取红包'}</div>
        </div>
      </div>
    `;
  }

  private createTransferHtml(msg: Message, _isUser: boolean, scale: number = 1): string {
    const amount = ((msg.transfer?.amount || 0) / 100).toFixed(2);
    const isReceived = msg.transfer?.isReceived || false;

    const w = Math.round(180 * scale);
    const iconSize = Math.round(44 * scale);
    const iconFontSize = Math.round(20 * scale);
    const gap = Math.round(12 * scale);
    const headerPadding = Math.round(12 * scale);
    const footerPadding = Math.round(8 * scale);
    const titleFontSize = Math.round(14 * scale);
    const amountFontSize = Math.round(20 * scale);
    const footerFontSize = Math.round(12 * scale);

    return `
      <div style="
        background: #fff;
        border-radius: ${Math.round(10 * scale)}px;
        width: ${w}px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        font-family: 'Microsoft YaHei', sans-serif;
        border: 1px solid #e0e0e0;
      ">
        <div style="
          background: #f5f5f5;
          padding: ${headerPadding}px;
        ">
          <div style="display: flex; align-items: center;">
            <div style="
              width: ${iconSize}px;
              height: ${iconSize}px;
              background: #07c160;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-right: ${gap}px;
            ">
              <span style="color: white; font-size: ${iconFontSize}px; font-weight: bold;">¥</span>
            </div>
            <div style="color: #333;">
              <div style="font-weight: 500; font-size: ${titleFontSize}px;">转账</div>
              <div style="font-weight: bold; font-size: ${amountFontSize}px; margin-top: 2px;">¥${amount}</div>
            </div>
          </div>
        </div>
        <div style="
          background: #f8f8f8;
          padding: ${footerPadding}px ${headerPadding}px;
          text-align: center;
          border-top: 1px solid #e0e0e0;
        ">
          <div style="
            font-size: ${footerFontSize}px;
            color: ${isReceived ? '#07c160' : '#999'};
          ">${isReceived ? '已收款' : '待收款'}</div>
        </div>
      </div>
    `;
  }

  private createImageHtml(msg: Message, imageCache: Map<string, HTMLImageElement>, scale: number = 1): string {
    const caption = this.escapeHtml(msg.image?.caption || '');
    const imageUrl = msg.image?.url || '';
    const size = Math.round(180 * scale);
    const borderRadius = Math.round(12 * scale);
    const captionFontSize = Math.round(12 * scale);
    const captionPadding = Math.round(4 * scale);
    const placeholderSize = Math.round(48 * scale);

    if (imageUrl && imageCache.has(imageUrl)) {
      return `
        <div style="
          border-radius: ${borderRadius}px;
          overflow: hidden;
          position: relative;
          max-width: ${size}px;
        ">
          <img 
            src="${imageUrl}" 
            style="
              width: ${size}px;
              height: ${size}px;
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
              padding: ${captionPadding}px ${Math.round(8 * scale)}px;
              font-size: ${captionFontSize}px;
              text-align: center;
            ">${caption}</div>
          ` : ''}
        </div>
      `;
    }

    return `
      <div style="
        background: #e0e0e0;
        border-radius: ${borderRadius}px;
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${placeholderSize}px;
        position: relative;
      ">📷</div>
    `;
  }

  private createVoiceHtml(msg: Message, isUser: boolean, darkMode: boolean, styles: any, scale: number = 1): string {
    const bg = isUser
      ? (darkMode ? '#128400' : styles.bubbleRightBg || '#95ec69')
      : (darkMode ? '#2d2d2d' : styles.bubbleLeftBg || '#ffffff');
    const color = isUser ? '#ffffff' : '#333';
    const duration = msg.voice?.duration || 0;
    const text = this.escapeHtml(msg.voice?.text || '');
    const bubbleWidth = Math.max(Math.round(120 * scale), Math.round(60 * scale + duration * 8 * scale));
    const paddingH = Math.round(12 * scale);
    const paddingV = Math.round(8 * scale);
    const borderRadius = Math.round(18 * scale);
    const arrowSize = Math.round(6 * scale);
    const arrowBorder = Math.round(8 * scale);
    const waveGap = Math.round(3 * scale);
    const waveBarWidth = Math.round(3 * scale);
    const durationFontSize = Math.round(12 * scale);
    const textFontSize = Math.round(14 * scale);

    const waveBars = [0,1,2,3,4,5,6,7].map(i => {
      const h = Math.round((8 + Math.sin(i * 0.8) * 6) * scale);
      return `<div style="width:${waveBarWidth}px;height:${h}px;background:${color};opacity:0.6;border-radius:1px;"></div>`;
    }).join('');

    const arrowBorderLeft = isUser ? `border-left: ${arrowBorder}px solid ${color};` : '';
    const arrowBorderRight = isUser ? '' : `border-right: ${arrowBorder}px solid ${color};`;

    return `
      <div style="
        background: ${bg};
        border-radius: ${borderRadius}px;
        padding: ${paddingV}px ${paddingH}px;
        display: flex;
        align-items: center;
        min-width: ${bubbleWidth}px;
        max-width: ${bubbleWidth}px;
      ">
        <div style="
          width: 0;
          height: 0;
          border-top: ${arrowSize}px solid transparent;
          border-bottom: ${arrowSize}px solid transparent;
          ${arrowBorderLeft}${arrowBorderRight}
          margin-right: ${Math.round(8 * scale)}px;
        "></div>
        <div style="display:flex;align-items:center;gap:${waveGap}px;">${waveBars}</div>
        <span style="margin-left:${Math.round(8 * scale)}px;font-size:${durationFontSize}px;opacity:0.7;color:${color};">${duration}"</span>
      </div>
      ${text ? `<div style="margin-top:${Math.round(4 * scale)}px;font-size:${textFontSize}px;color:${darkMode ? '#aaa' : '#666'};padding-left:${Math.round(4 * scale)}px;">${text}</div>` : ''}
    `;
  }

  private createMessageHtml(
    msg: Message,
    isUser: boolean,
    darkMode: boolean,
    styles: any,
    imageCache: Map<string, HTMLImageElement>,
    scale: number = 1
  ): string {
    const avatarSize = Math.round((styles.avatarSize || 40) * scale);
    const gap = Math.round(8 * scale);
    const padding = Math.round(10 * scale);
    const senderFontSize = Math.round(12 * scale);
    const senderMarginBottom = Math.round(4 * scale);

    if (msg.type === 'system') {
      const systemText = this.escapeHtml(msg.system?.text || msg.content || '');
      return `
        <div style="
          text-align: center;
          margin: ${gap}px 0;
        ">
          <span style="
            background: ${darkMode ? '#333' : '#f0f0f0'};
            color: ${darkMode ? '#888' : '#888'};
            font-size: ${Math.round(12 * scale)}px;
            padding: ${Math.round(4 * scale)}px ${Math.round(12 * scale)}px;
            border-radius: ${Math.round(10 * scale)}px;
            display: inline-block;
          ">${systemText}</span>
        </div>
      `;
    }

    let contentHtml = '';

    if (msg.type === 'redpacket') {
      contentHtml = this.createRedPacketHtml(msg, isUser, scale);
    } else if (msg.type === 'transfer') {
      contentHtml = this.createTransferHtml(msg, isUser, scale);
    } else if (msg.type === 'image') {
      contentHtml = this.createImageHtml(msg, imageCache, scale);
    } else if (msg.type === 'voice') {
      contentHtml = this.createVoiceHtml(msg, isUser, darkMode, styles, scale);
    } else {
      contentHtml = this.createTextBubbleHtml(msg.content || '', isUser, darkMode, styles, scale);
    }

    const flexDirection = isUser ? 'row-reverse' : 'row';
    const avatarMarginLeft = isUser ? gap : 0;
    const avatarMarginRight = isUser ? 0 : gap;
    const senderTextAlign = isUser ? 'right' : 'left';

    return `
      <div style="
        display: flex;
        flex-direction: ${flexDirection};
        align-items: flex-start;
        margin-bottom: ${gap}px;
        padding: 0 ${padding}px;
      ">
        ${this.createAvatarHtml(msg.sender, avatarSize)}
        <div style="
          margin-left: ${avatarMarginLeft}px;
          margin-right: ${avatarMarginRight}px;
          max-width: 65%;
        ">
          <div style="
            font-size: ${senderFontSize}px;
            color: #888;
            margin-bottom: ${senderMarginBottom}px;
            text-align: ${senderTextAlign};
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
    imageCache: Map<string, HTMLImageElement>,
    scrollTop: number = 0
  ) {
    if (!this.container) return;

    const avatarSize = Math.round((styles.avatarSize || 40));
    const fontSize = Math.round(styles.fontSize || 16);
    const headerHeight = avatarSize + 8;
    const statusBarHeight = (styles as any).statusBarHeight || 0;
    const contentPadding = 10;
    const width = styles.width;
    const height = styles.height;
    const scale = width / 375;

    const headerBg = darkMode ? '#2d2d2d' : (styles.headerBg || '#f5f5f5');
    const headerColor = darkMode ? '#ffffff' : (styles.headerColor || '#1a1a1a');
    const contentBg = darkMode ? '#1f1f1f' : (styles.background || '#f5f5f5');

    let messagesHtml = '';
    for (const msg of messages) {
      const isUser = msg.role === 'user';
      messagesHtml += this.createMessageHtml(msg, isUser, darkMode, styles, imageCache, scale);
    }

    const totalHeaderHeight = headerHeight + statusBarHeight;

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
          height: ${statusBarHeight}px;
          background: ${headerBg};
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 ${Math.round(8 * scale)}px;
          color: #888;
          font-size: ${Math.round(10 * scale)}px;
          flex-shrink: 0;
        ">
          <span>10:30</span>
          <span>📶 📡 🔋</span>
        </div>
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
        <div id="messages-container" style="
          position: absolute;
          top: ${totalHeaderHeight}px;
          left: 0;
          right: 0;
          bottom: 0;
          overflow-y: auto;
          padding: ${contentPadding}px;
        ">
          <div id="messages-wrapper" style="
            padding-top: ${scrollTop}px;
          ">
            ${messagesHtml}
          </div>
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

      const scale = width / 375;
      const avatarSize = (styles.avatarSize || 40) * scale;
      const headerHeight = avatarSize + 8;
      const statusBarHeight = (styles as any).statusBarHeight || 0;
      const contentPadding = 10;
      const totalHeaderHeight = headerHeight + statusBarHeight;
      const visibleContentHeight = height - totalHeaderHeight - contentPadding * 2;
      
      const estimatedRowHeight = avatarSize + 20;
      const maxVisibleRows = Math.floor(visibleContentHeight / estimatedRowHeight);
      
      let scrollTop = 0;
      if (visibleMessages.length > maxVisibleRows) {
        const extraMessages = visibleMessages.length - maxVisibleRows;
        scrollTop = extraMessages * estimatedRowHeight;
      }

      this.updateDOMContent(visibleMessages, darkMode, styles, this.imageCache, scrollTop);

      await new Promise(resolve => setTimeout(resolve, 10));

      const messagesContainer = this.container?.querySelector('#messages-container') as HTMLElement;
      if (messagesContainer && scrollTop > 0) {
        messagesContainer.scrollTop = scrollTop;
      }

      await new Promise(resolve => setTimeout(resolve, 10));

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
