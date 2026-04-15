import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import html2canvas from 'html2canvas';
import type { Message, ExportSettings, ThemeStyles, UserProfile } from '@/types';
import { wechatEmojis } from '@/utils/emoji';

interface PlatformExportConfig {
  name: string;
  styles: ThemeStyles & { deviceType?: 'mobile' | 'desktop' };
}

const BASE_WIDTH = 375;

function scaleStyles(styles: ThemeStyles & { deviceType?: 'mobile' | 'desktop' }, targetWidth: number): ThemeStyles & { deviceType?: 'mobile' | 'desktop' } {
  const scale = targetWidth / BASE_WIDTH;
  return {
    ...styles,
    fontSize: Math.round(styles.fontSize * scale),
    bubblePadding: Math.round(styles.bubblePadding * scale),
    bubbleRadius: Math.round(styles.bubbleRadius * scale),
    avatarSize: Math.round(styles.avatarSize * scale),
    messageGap: Math.round(styles.messageGap * scale),
  };
}

async function waitForImages(container: HTMLElement, timeout = 3000): Promise<void> {
  const images = Array.from(container.querySelectorAll<HTMLImageElement>('img'));
  if (images.length === 0) return;

  await Promise.race([
    Promise.all(images.map(img => new Promise<void>(resolve => {
      if (img.complete) {
        resolve();
        return;
      }
      img.onload = () => resolve();
      img.onerror = () => resolve();
    })) ),
    new Promise<void>(resolve => setTimeout(resolve, timeout)),
  ]);
}

// ============================================================================
// DOM-based Image Export — 保证与 CSS 预览100%一致
// 原理：创建与预览完全相同的 DOM 结构，用 html2canvas 截图
// ============================================================================

// Renders a single message to HTML string, matching ChatContainer's CSS exactly
function getMessageHtml(
  msg: Message,
  _index: number,
  config: PlatformExportConfig,
  userAvatarMap: Map<string, string>
): string {
  const isUser = msg.role === 'user';
  const { styles } = config;
  const fontSize = styles.fontSize;
  const avatarSize = styles.avatarSize;
  const bubblePadding = styles.bubblePadding;
  const bubbleBg = isUser ? styles.bubbleRightBg : styles.bubbleLeftBg;
  const bubbleColor = isUser ? styles.bubbleRightColor : styles.bubbleLeftColor;
  const avatar = userAvatarMap.get(msg.sender) || msg.avatar || createAvatarDataUrl(msg.sender, avatarSize);

  const borderRadius = `${styles.bubbleRadius}px`;
  const gap = styles.messageGap;
  const senderHeight = fontSize * 0.7;
  const senderHeightPx = avatarSize * 0.33; // 用户名占头像高度的 33%

  if (isUser) {
    // 右边消息：flex-direction: row-reverse
    return `
    <div style="display: flex; flex-direction: row-reverse; gap: ${gap}px; margin-bottom: ${gap}px; align-items: flex-start;">
      <img src="${avatar}" alt="${escapeHtml(msg.sender)}" style="width: ${avatarSize}px; height: ${avatarSize}px; border-radius: 50%; flex-shrink: 0; object-fit: cover;" />
      <div style="display: flex; flex-direction: column; align-items: flex-end;">
        <div style="height: ${senderHeightPx}px; font-size: ${senderHeight}px; color: #888; display: flex; align-items: flex-end; line-height: 1;">
          ${escapeHtml(msg.sender)}
        </div>
        <div style="padding: ${bubblePadding}px; border-radius: ${borderRadius}; background-color: ${bubbleBg}; color: ${bubbleColor}; font-size: ${fontSize}px; font-family: ${styles.fontFamily}; word-break: break-word; line-height: 1.4; display: inline-block; max-width: 100%;">
          ${renderContentWithEmoji(msg.content)}
        </div>
      </div>
    </div>`;
  } else {
    // 左边消息：flex-direction: row
    return `
    <div style="display: flex; flex-direction: row; gap: ${gap}px; margin-bottom: ${gap}px; align-items: flex-start;">
      <img src="${avatar}" alt="${escapeHtml(msg.sender)}" style="width: ${avatarSize}px; height: ${avatarSize}px; border-radius: 50%; flex-shrink: 0; object-fit: cover;" />
      <div style="display: flex; flex-direction: column; align-items: flex-start;">
        <div style="height: ${senderHeightPx}px; font-size: ${senderHeight}px; color: #888; display: flex; align-items: flex-end; line-height: 1;">
          ${escapeHtml(msg.sender)}
        </div>
        <div style="padding: ${bubblePadding}px; border-radius: ${borderRadius}; background-color: ${bubbleBg}; color: ${bubbleColor}; font-size: ${fontSize}px; font-family: ${styles.fontFamily}; word-break: break-word; line-height: 1.4; display: inline-block; max-width: 100%;">
          ${renderContentWithEmoji(msg.content)}
        </div>
      </div>
    </div>`;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generateChatHtml(
  messages: Message[],
  config: PlatformExportConfig,
  width: number,
  height: number,
  chatTitle?: string,
  users?: UserProfile[]
): string {
  const scaledStyles = scaleStyles(config.styles, width);
  const headerHeight = scaledStyles.avatarSize + Math.round(8 * (width / BASE_WIDTH));

  const userAvatarMap = new Map<string, string>();
  if (users) {
    users.forEach(u => userAvatarMap.set(u.name, u.avatar));
  }

  const scaledConfig = { ...config, styles: scaledStyles };

  let messagesHtml = '';
  for (let i = 0; i < messages.length; i++) {
    messagesHtml += getMessageHtml(messages[i], i, scaledConfig, userAvatarMap);
  }

  const title = escapeHtml(chatTitle || config.name);

  const contentHeight = height - headerHeight;

  return `
    <div style="width: ${width}px; height: ${height}px; background-color: ${scaledStyles.background}; position: relative; overflow: hidden; font-family: ${scaledStyles.fontFamily};">
      <div style="position: absolute; top: ${headerHeight}px; left: 0; width: ${width}px; height: ${contentHeight}px; overflow: hidden; padding: ${scaledStyles.messageGap}px; background-color: ${scaledStyles.background}; box-sizing: border-box;">
        ${messagesHtml}
      </div>
      <div style="position: absolute; top: 0; left: 0; width: ${width}px; height: ${headerHeight}px; background-color: ${scaledStyles.headerBg}; color: ${scaledStyles.headerColor}; display: flex; align-items: center; justify-content: center; font-size: ${scaledStyles.fontSize}px; font-weight: 500; z-index: 100;">
        ${title}
      </div>
    </div>
  `;
}

// ============================================================================
// Emoji support for HTML export: replace [xxx] with <img> tags
// ============================================================================
const EMOJI_HTML_MAP = new Map(wechatEmojis.map(e => [e.key, e]));

function renderContentWithEmoji(content: string): string {
  // Process content character by character, replacing known [emoji] with <img> tags
  // Everything else gets HTML-escaped
  const EMOJI_RE = /(\[[^\]]{1,10}\])/g;
  let result = '';
  let lastIndex = 0;
  let match;

  while ((match = EMOJI_RE.exec(content)) !== null) {
    // HTML-escape text before the emoji
    if (match.index > lastIndex) {
      result += escapeHtml(content.slice(lastIndex, match.index));
    }

    // Emoji or unknown [xxx] pattern
    if (EMOJI_HTML_MAP.has(match[0])) {
      const emoji = EMOJI_HTML_MAP.get(match[0])!;
      result += `<img src="${emoji.url}" alt="${emoji.key}" style="width:1.2em;height:1.2em;vertical-align:middle;margin:0 1px;display:inline;" onerror="this.style.display:none" />`;
    } else {
      // Unknown "[xxx]" pattern: escape and show as text
      result += escapeHtml(match[0]);
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last emoji
  if (lastIndex < content.length) {
    result += escapeHtml(content.slice(lastIndex));
  }

  return result;
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

function createAvatarDataUrl(name: string, size: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  drawAvatarToCanvas(ctx, name, size);
  return canvas.toDataURL('image/png');
}

// ============================================================================
// 核心修复: 图片导出改走 DOM-based 路线，保证与预览100%一致
// ============================================================================
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
    console.log(`[captureAndSaveFrame] frame=${filename}, size=${uint8Array.length} bytes`);
    await this.ffmpeg.writeFile(filename, uint8Array);
  }

  async compileVideo(frameCount: number, fps: number): Promise<Blob> {
    if (!this.ffmpeg || !this.loaded) {
      throw new Error('FFmpeg not initialized');
    }

    if (frameCount === 0) {
      throw new Error('没有生成任何帧，无法合成视频');
    }

    console.log('[compileVideo] frameCount=', frameCount, 'fps=', fps);

    await this.ffmpeg.exec([
      '-framerate', String(fps),
      '-start_number', '0',
      '-i', 'frame%05d.png',      '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2',      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'fast',
      '-y',
      'output.mp4'
    ]);

    const data = await this.ffmpeg.readFile('output.mp4') as Uint8Array;
    console.log('[compileVideo] output.mp4 size=', data.length);

    for (let i = 0; i < frameCount; i++) {
      const filename = `frame${String(i).padStart(5, '0')}.png`;
      await this.ffmpeg.deleteFile(filename).catch(() => {});
    }
    await this.ffmpeg.deleteFile('output.mp4').catch(() => {});

    return new Blob([data as unknown as BlobPart], { type: 'video/mp4' });
  }

  // 清理 FFmpeg 资源
  async terminate(): Promise<void> {
    if (this.ffmpeg) {
      try {
        await this.ffmpeg.terminate();
      } catch (e) {
        console.warn('[Exporter] terminate error:', e);
      }
      this.ffmpeg = null;
      this.loaded = false;
    }
  }

  // 使用 html2canvas 截图，与 CSS 预览完全一致
  async captureImage(element: HTMLElement, settings?: ExportSettings): Promise<Blob> {
    const targetWidth = settings?.width || 1080;
    const targetHeight = settings?.height || 1920;

    // Wait for fonts and image assets to stabilize
    await new Promise(resolve => setTimeout(resolve, 100));
    await document.fonts.ready;
    await waitForImages(element);

    const canvas = await html2canvas(element, {
      scale: 1,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null, // transparent background
      width: targetWidth,
      height: targetHeight,
      logging: false,
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
    container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
    container.innerHTML = html;
    document.body.appendChild(container);

    // Wait for fonts and images to load
    await document.fonts.ready;
    await waitForImages(container);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => {
      setTimeout(resolve, 50);
    })));

    console.log('[captureImageFromHtml] capturing HTML to canvas', { width, height, htmlLength: html.length });
    const canvas = await html2canvas(container, {
      scale: 1,
      width,
      height,
      backgroundColor: background,
      useCORS: true,
      allowTaint: true,
      logging: false,
    });
    console.log('[captureImageFromHtml] canvas generated', { width: canvas.width, height: canvas.height });

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

  // ============================================================================
  // 使用真正的 Canvas 渲染器导出，而不是 html2canvas
  // ============================================================================
  async captureImageFromCanvas(
    messages: Message[],
    styles: ThemeStyles,
    width: number,
    height: number,
    title: string,
    users: UserProfile[],
    darkMode: boolean = false
  ): Promise<Blob> {
    const canvas = document.createElement('canvas');
    const { renderChatToCanvas, canvasToBlob: canvasToBlobUtil } = await import('./canvasRenderer');

    const imageCache = new Map<string, HTMLImageElement>();

    await Promise.all(users.map(user => {
      if (!user.avatar) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          imageCache.set(`avatar:${user.name}`, img);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = user.avatar;
      });
    }));

    await Promise.all(messages
      .filter(m => m.type === 'image' && m.image?.url)
      .map(m => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            imageCache.set(m.image!.url!, img);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = m.image!.url!;
        });
      })
    );

    await document.fonts.ready;
    
    console.log('[Exporter] captureImageFromCanvas called with:', {
      messageCount: messages.length,
      width,
      height,
      title,
      darkMode,
      styles: { ...styles, background: styles.background, bubblePadding: styles.bubblePadding }
    });
    
    renderChatToCanvas(canvas, {
      width,
      height,
      styles,
      title,
      messages,
      users,
      darkMode,
      imageCache,
    });
    
    return canvasToBlobUtil(canvas);
  }

  async captureFrameFromCanvas(
    messages: Message[],
    styles: ThemeStyles,
    width: number,
    height: number,
    title: string,
    users: UserProfile[],
    darkMode: boolean = false
  ): Promise<Blob> {
    return this.captureImageFromCanvas(messages, styles, width, height, title, users, darkMode);
  }

  async recordVideo(
    _container: HTMLElement,
    messages: Message[],
    settings: ExportSettings,
    platformConfig: PlatformExportConfig,
    onProgress: (progress: number) => void,
    darkMode: boolean = false,
    framesPerMessage?: number,
    users: UserProfile[] = []
  ): Promise<Blob> {
    if (!this.ffmpeg || !this.loaded) {
      await this.init();
    }

    const ffmpeg = this.ffmpeg!;
    const { fps, width, height } = settings;
    const { styles } = platformConfig;

    onProgress(5);

    // 预加载所有图片消息
    const imageUrls = messages
      .filter(m => m.type === 'image' && m.image?.url)
      .map(m => m.image!.url!);
    
    const imageCache = new Map<string, HTMLImageElement>();

    await Promise.all(users.map(user => {
      if (!user.avatar) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          imageCache.set(`avatar:${user.name}`, img);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = user.avatar;
      });
    }));

    await Promise.all(imageUrls.map(url => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          imageCache.set(url, img);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = url;
      });
    }));

    const { renderChatToCanvas } = await import('./canvasRenderer');
    await document.fonts.ready;

    const dpr = window.devicePixelRatio || 1;
    const framesPerMsg = framesPerMessage ?? Math.round(fps / 2);

    console.log('[recordVideo] Starting with params:', {
      fps,
      width,
      height,
      dpr,
      framesPerMsg,
      messagesCount: messages.length
    });

    let frameIndex = 0;

    for (let i = 0; i < messages.length; i++) {
      const canvas = document.createElement('canvas');
      renderChatToCanvas(canvas, {
        width,
        height,
        styles,
        title: platformConfig.name,
        messages: messages.slice(0, i + 1),
        users,
        imageCache,
        darkMode,
      });

      const totalContentHeight = canvas.height / dpr;

      for (let f = 0; f < framesPerMsg; f++) {
        const targetCanvas = document.createElement('canvas');
        targetCanvas.width = width * dpr;
        targetCanvas.height = height * dpr;

        const targetCtx = targetCanvas.getContext('2d');
        if (!targetCtx) {
          console.error('[recordVideo] Failed to get 2d context for frame', frameIndex);
          continue;
        }
        targetCtx.scale(dpr, dpr);

        targetCtx.fillStyle = styles.background;
        targetCtx.fillRect(0, 0, width, height);

        if (totalContentHeight > height) {
          const scrollY = totalContentHeight - height;
          targetCtx.drawImage(
            canvas,
            0, scrollY * dpr, width * dpr, height * dpr,
            0, 0, width, height
          );
        } else {
          targetCtx.drawImage(canvas, 0, 0, width, totalContentHeight);
        }

        const blob = await new Promise<Blob | null>((resolve) => {
          targetCanvas.toBlob(resolve, 'image/png');
        });

        if (blob) {
          console.log(`[recordVideo] Generated frame ${frameIndex}, size: ${blob.size} bytes`);
          const filename = `frame${String(frameIndex).padStart(5, '0')}.png`;
          const arrayBuffer = await blob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          await ffmpeg.writeFile(filename, uint8Array);
          frameIndex++;
        } else {
          console.error(`[recordVideo] Failed to generate blob for frame ${frameIndex}`);
        }
      }

      const progress = 5 + Math.round(((i + 1) / messages.length) * 75);
      onProgress(Math.min(progress, 80));
    }

    onProgress(85);

    console.log(`[recordVideo] Generated ${frameIndex} frames, executing FFmpeg`);
    console.log('[recordVideo] FFmpeg command args:', [
      '-framerate', String(fps),
      '-start_number', '0',
      '-i', 'frame%05d.png',
      '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'fast',
      '-y',
      'output.mp4'
    ]);

    if (frameIndex === 0) {
      throw new Error('没有生成任何帧，无法合成视频');
    }

    try {
      await ffmpeg.exec([
        '-framerate', String(fps),
        '-start_number', '0',
        '-i', 'frame%05d.png',
        '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-preset', 'fast',
        '-y',
        'output.mp4'
      ]);
      console.log('[recordVideo] FFmpeg execution completed successfully');
    } catch (e) {
      console.error('[recordVideo] FFmpeg exec error:', e);
      throw new Error('视频合成失败: ' + (e as Error).message);
    }

    onProgress(95);

    let data: Uint8Array;
    try {
      data = await ffmpeg.readFile('output.mp4') as Uint8Array;
      console.log(`[recordVideo] Read output.mp4, size: ${data.length} bytes`);
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

    const resultBlob = new Blob([data as unknown as BlobPart], { type: 'video/mp4' });
    console.log(`[recordVideo] Final blob size: ${resultBlob.size} bytes`);

    return resultBlob;
  }
}
