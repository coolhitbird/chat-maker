import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import html2canvas from 'html2canvas';
import type { Message, ExportSettings, ThemeStyles, UserProfile } from '@/types';

interface PlatformExportConfig {
  name: string;
  styles: ThemeStyles & { deviceType?: 'mobile' | 'desktop' };
}

function getMessageHtml(msg: Message, _index: number, _width: number, config: PlatformExportConfig, userAvatarMap: Map<string, string>): string {
  const isUser = msg.role === 'user';
  const { styles } = config;
  const fontSize = styles.fontSize;
  const avatarSize = styles.avatarSize;
  const bubblePadding = styles.bubblePadding;
  const bubbleBg = isUser ? styles.bubbleRightBg : styles.bubbleLeftBg;
  const bubbleColor = isUser ? styles.bubbleRightColor : styles.bubbleLeftColor;
  const avatarRadius = '50%';
  const avatar = userAvatarMap.get(msg.sender) || msg.avatar || createAvatarCanvas(msg.sender, avatarSize);
  
  const borderRadius = `${styles.bubbleRadius}px`;
  const paddingV = bubblePadding;
  const paddingH = bubblePadding + 2;
  const gap = styles.messageGap;
  
  if (isUser) {
    return `
    <div style="display: flex; flex-direction: row-reverse; gap: ${gap}px; margin-bottom: ${gap}px; align-items: flex-start;">
      <img src="${avatar}" alt="${msg.sender}" style="width: ${avatarSize}px; height: ${avatarSize}px; border-radius: ${avatarRadius}; flex-shrink: 0; object-fit: cover;" />
      <div style="display: flex; flex-direction: column; align-items: flex-end;">
        <div style="font-size: ${fontSize * 0.7}px; color: #888; margin-bottom: 2px;">${msg.sender}</div>
        <div style="padding: ${paddingV}px ${paddingH}px; border-radius: ${borderRadius}; background-color: ${bubbleBg}; color: ${bubbleColor}; font-size: ${fontSize}px; font-family: ${styles.fontFamily}; word-break: break-word; line-height: 1.5; display: flex; align-items: center;">
          ${msg.content}
        </div>
      </div>
    </div>`;
  } else {
    return `
    <div style="display: flex; flex-direction: row; gap: ${gap}px; margin-bottom: ${gap}px; align-items: flex-start;">
      <img src="${avatar}" alt="${msg.sender}" style="width: ${avatarSize}px; height: ${avatarSize}px; border-radius: ${avatarRadius}; flex-shrink: 0; object-fit: cover;" />
      <div style="display: flex; flex-direction: column; align-items: flex-start;">
        <div style="font-size: ${fontSize * 0.7}px; color: #888; margin-bottom: 2px;">${msg.sender}</div>
        <div style="padding: ${paddingV}px ${paddingH}px; border-radius: ${borderRadius}; background-color: ${bubbleBg}; color: ${bubbleColor}; font-size: ${fontSize}px; font-family: ${styles.fontFamily}; word-break: break-word; line-height: 1.5; display: flex; align-items: center;">
          ${msg.content}
        </div>
      </div>
    </div>`;
  }
}

export function generateChatHtml(messages: Message[], config: PlatformExportConfig, width: number, height: number, chatTitle?: string, users?: UserProfile[]): string {
  const { styles } = config;
  const headerHeight = styles.avatarSize + 8;
  
  const userAvatarMap = new Map<string, string>();
  if (users) {
    users.forEach(u => userAvatarMap.set(u.name, u.avatar));
  }
  
  let messagesHtml = '';
  for (let i = 0; i < messages.length; i++) {
    messagesHtml += getMessageHtml(messages[i], i, width, config, userAvatarMap);
  }
  
  const title = chatTitle || config.name;
  
  return `
    <div style="width: ${width}px; height: ${height}px; background-color: ${styles.background}; display: flex; flex-direction: column; overflow: hidden; font-family: ${styles.fontFamily};">
      <div style="height: ${headerHeight}px; background-color: ${styles.headerBg}; color: ${styles.headerColor}; display: flex; align-items: center; justify-content: center; font-size: ${styles.fontSize}px;">
        ${title}
      </div>
      <div style="flex: 1; overflow-y: auto; padding: ${styles.messageGap}px; background-color: ${styles.background};">
        ${messagesHtml}
      </div>
    </div>
  `;
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

function drawAvatarToCanvas(ctx: CanvasRenderingContext2D, name: string, size: number): void {
  const color = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  const initials = getInitials(name);
  const center = size / 2;
  const radius = size / 2;
  
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size * 0.38}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, center, center + 2);
}

function createAvatarCanvas(name: string, size: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  drawAvatarToCanvas(ctx, name, size);
  return canvas.toDataURL('image/png');
}

export class Exporter {
  private ffmpeg: FFmpeg | null = null;
  private loaded = false;

  async init(): Promise<void> {
    if (this.loaded) return;

    this.ffmpeg = new FFmpeg();
    
    this.ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg]', message);
    });
    
    this.ffmpeg.on('progress', ({ progress }) => {
      console.log('[FFmpeg Progress]', progress);
    });
    
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    
    try {
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      this.loaded = true;
    } catch (err) {
      console.error('FFmpeg load error:', err);
      throw err;
    }
  }

  async captureAndSaveFrame(blob: Blob, index: number): Promise<void> {
    if (!this.ffmpeg || !this.loaded) {
      throw new Error('FFmpeg not initialized');
    }
    const filename = `frame${String(index).padStart(5, '0')}.png`;
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    await this.ffmpeg.writeFile(filename, uint8Array);
  }

  async compileVideo(frameCount: number, fps: number): Promise<Blob> {
    if (!this.ffmpeg || !this.loaded) {
      throw new Error('FFmpeg not initialized');
    }

    await this.ffmpeg.exec([
      '-framerate', String(fps),
      '-i', 'frame%05d.png',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'fast',
      '-y',
      'output.mp4'
    ]);

    const data = await this.ffmpeg.readFile('output.mp4') as Uint8Array;

    for (let i = 0; i < frameCount; i++) {
      const filename = `frame${String(i).padStart(5, '0')}.png`;
      await this.ffmpeg.deleteFile(filename).catch(() => {});
    }
    await this.ffmpeg.deleteFile('output.mp4').catch(() => {});

    return new Blob([data as unknown as BlobPart], { type: 'video/mp4' });
  }

  async captureImage(element: HTMLElement, settings?: ExportSettings): Promise<Blob> {
    const targetWidth = settings?.width || 1080;
    const targetHeight = settings?.height || 1920;
    
    await new Promise(resolve => setTimeout(resolve, 100));

    const canvas = await html2canvas(element, {
      scale: 1,
      useCORS: true,
      backgroundColor: '#f5f5f5',
      width: targetWidth,
      height: targetHeight,
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to capture image'));
      }, 'image/png');
    });
  }

  async captureImageFromHtml(html: string, width: number, height: number, background: string): Promise<Blob> {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
    container.style.overflow = 'hidden';
    container.innerHTML = html;
    document.body.appendChild(container);

    // 使用 requestAnimationFrame 确保 DOM 完全渲染
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await new Promise(resolve => setTimeout(resolve, 200));

    const canvas = await html2canvas(container, {
      scale: 1,
      width: width,
      height: height,
      backgroundColor: background,
      logging: false,
    });

    document.body.removeChild(container);

    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to capture image'));
      }, 'image/png');
    });
  }

  async captureFrameFromHtml(html: string, width: number, height: number, background: string): Promise<Blob> {
    return this.captureImageFromHtml(html, width, height, background);
  }

  async captureImageFromCanvas(
    messages: Message[],
    styles: ThemeStyles,
    width: number,
    height: number,
    title: string,
    users: UserProfile[]
  ): Promise<Blob> {
    const canvas = document.createElement('canvas');
    const { renderChatToCanvas, canvasToBlob: canvasToBlobUtil } = await import('./canvasRenderer');
    
    renderChatToCanvas(canvas, {
      width,
      height,
      styles,
      title,
      messages,
      users,
    });
    
    return canvasToBlobUtil(canvas);
  }

  async captureFrameFromCanvas(
    messages: Message[],
    styles: ThemeStyles,
    width: number,
    height: number,
    title: string,
    users: UserProfile[]
  ): Promise<Blob> {
    return this.captureImageFromCanvas(messages, styles, width, height, title, users);
  }

  async recordVideo(
    _container: HTMLElement,
    messages: Message[],
    settings: ExportSettings,
    platformConfig: PlatformExportConfig,
    onProgress: (progress: number) => void
  ): Promise<Blob> {
    if (!this.ffmpeg || !this.loaded) {
      await this.init();
    }

    const ffmpeg = this.ffmpeg!;
    const { fps, messageInterval, width, height } = settings;
    const { styles } = platformConfig;

    onProgress(5);

    let frameIndex = 0;

    const headerHeight = styles.avatarSize + 8;
    const chatHtml = `
      <div style="width: ${width}px; height: ${height}px; background-color: ${styles.background}; display: flex; flex-direction: column; overflow: hidden; font-family: ${styles.fontFamily};">
        <div style="height: ${headerHeight}px; background-color: ${styles.headerBg}; color: ${styles.headerColor}; display: flex; align-items: center; justify-content: center; font-size: ${styles.fontSize}px;">
          ${platformConfig.name} 聊天
        </div>
        <div id="chat-body" style="flex: 1; overflow-y: auto; padding: ${styles.messageGap}px; background-color: ${styles.background};">
        </div>
      </div>
    `;

    const previewWindow = window.open('', '_blank', `width=${width + 50},height=${height + 100},left=0,top=0`);
    if (!previewWindow) {
      throw new Error('无法打开预览窗口，请允许弹出窗口');
    }
    
    previewWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: ${width}px; height: ${height}px; overflow: hidden; }
        </style>
      </head>
      <body>${chatHtml}</body>
      </html>
    `);
    previewWindow.document.close();

    await new Promise(resolve => setTimeout(resolve, 1000));

    const captureFrame = async () => {
      const canvas = await html2canvas(previewWindow.document.body, {
        scale: 1,
        width: width,
        height: height,
        useCORS: true,
        backgroundColor: styles.background,
        logging: false,
      });

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
    };

    for (let i = 0; i < messages.length; i++) {
      const body = previewWindow.document.getElementById('chat-body');
      if (body) {
        const msgHtml = getMessageHtml(messages[i], i, width, platformConfig, new Map());
        body.insertAdjacentHTML('beforeend', msgHtml);
        body.scrollTop = body.scrollHeight;
      }

      const framesPerMessage = Math.round((messageInterval / 1000) * fps);
      for (let f = 0; f < framesPerMessage; f++) {
        await captureFrame();
        await new Promise(resolve => setTimeout(resolve, 1000 / fps));
      }

      const progress = 5 + Math.round(((i + 1) / messages.length) * 75);
      onProgress(Math.min(progress, 80));
    }

    for (let i = 0; i < fps * 2; i++) {
      await captureFrame();
      await new Promise(resolve => setTimeout(resolve, 1000 / fps));
    }

    previewWindow.close();

    onProgress(85);

    try {
      await ffmpeg.exec([
        '-framerate', String(fps),
        '-i', 'frame%05d.png',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-preset', 'fast',
        '-y',
        'output.mp4'
      ]);
    } catch (e) {
      console.error('FFmpeg exec error:', e);
      throw new Error('视频合成失败: ' + (e as Error).message);
    }

    onProgress(95);

    let data: Uint8Array;
    try {
      data = await ffmpeg.readFile('output.mp4') as Uint8Array;
    } catch (e) {
      console.error('Read file error:', e);
      throw new Error('读取输出文件失败');
    }
    
    for (let i = 0; i < frameIndex; i++) {
      const filename = `frame${String(i).padStart(5, '0')}.png`;
      await ffmpeg.deleteFile(filename).catch(() => {});
    }
    await ffmpeg.deleteFile('output.mp4').catch(() => {});

    onProgress(100);

    return new Blob([data as unknown as BlobPart], { type: 'video/mp4' });
  }
}
