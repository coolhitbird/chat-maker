import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import html2canvas from 'html2canvas';
import type { Message, UserProfile } from '@/types';
import type { TypingAnimationConfig, ExportConfig, MessageTypingSequence } from '../types';
import { generateTypingSequence, getVisibleContentAtTime, estimateDuration, calculateSpeedMultiplier } from '../generators';
import { wechatEmojis } from '@/utils/emoji';

// emoji map for DOM rendering: [微笑] → unicode
const EMOJI_MAP = new Map(wechatEmojis.map(e => [e.key, e]));

function renderTextWithEmoji(text: string): string {
  return text.replace(/\[[^\]]{1,10}\]/g, (match) => {
    const emoji = EMOJI_MAP.get(match);
    return emoji?.unicode ? emoji.unicode : match;
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getInitials(name: string): string {
  if (!name) return '?';
  if (name.length === 1) return name.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ef4444', '#f97316', '#eab308', '#22c55e'];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
}

function createAvatarHtml(name: string, avatarSize: number, avatarUrl?: string): string {
  if (avatarUrl) {
    return `<img src="${avatarUrl}" style="width:${avatarSize}px;height:${avatarSize}px;border-radius:50%;object-fit:cover;flex-shrink:0;" crossorigin="anonymous" />`;
  }
  const color = getAvatarColor(name);
  const initials = getInitials(name);
  const fontSize = Math.round(avatarSize * 0.38);
  return `<div style="width:${avatarSize}px;height:${avatarSize}px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:${fontSize}px;flex-shrink:0;font-family:Arial,sans-serif;">${initials}</div>`;
}

function createTextBubbleHtml(innerHtml: string, isUser: boolean, darkMode: boolean, styles: any, scale: number): string {
  const bg = isUser ? (darkMode ? '#128400' : styles.bubbleRightBg || '#07C160') : (darkMode ? '#2d2d2d' : styles.bubbleLeftBg || '#ffffff');
  const color = isUser ? (darkMode ? '#fff' : styles.bubbleRightColor || '#FFFFFF') : (darkMode ? '#fff' : styles.bubbleLeftColor || '#1A1A1A');
  const paddingH = Math.round(12 * scale);
  const paddingV = Math.round(10 * scale);
  const borderRadius = Math.round(18 * scale);
  const fontSize = Math.round((styles.fontSize || 16) * scale);
  return `<div style="background:${bg};color:${color};padding:${paddingV}px ${paddingH}px;border-radius:${borderRadius}px;font-size:${fontSize}px;line-height:1.4;max-width:100%;word-break:break-word;display:inline-block;vertical-align:top;box-sizing:border-box;">${innerHtml}</div>`;
}

function createRedPacketHtml(msg: Message, scale: number): string {
  const amount = ((msg.redPacket?.amount || 0) / 100).toFixed(2);
  const greeting = escapeHtml(msg.redPacket?.greeting || '恭喜发财，大吉大利');
  const isOpened = msg.redPacket?.isOpened || false;
  const w = Math.round(180 * scale);
  const p = Math.round(12 * scale);
  return `<div style="background:#fff;border-radius:${Math.round(10*scale)}px;width:${w}px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
    <div style="background:linear-gradient(135deg,#e74c3c,#c0392b);padding:${p}px;display:flex;align-items:center;gap:${Math.round(10*scale)}px;">
      <div style="width:${Math.round(44*scale)}px;height:${Math.round(44*scale)}px;background:#ffd700;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${Math.round(22*scale)}px;">🧧</div>
      <div style="color:#fff;"><div style="font-weight:bold;font-size:${Math.round(15*scale)}px;">微信红包</div><div style="font-size:${Math.round(12*scale)}px;opacity:0.9;">${greeting}</div></div>
    </div>
    <div style="background:#f8f8f8;padding:${Math.round(8*scale)}px;text-align:center;border-top:1px solid #eee;font-size:${Math.round(12*scale)}px;color:${isOpened?'#e74c3c':'#666'};">${isOpened?`已领取 ¥${amount}`:'领取红包'}</div>
  </div>`;
}

function createTransferHtml(msg: Message, scale: number): string {
  const amount = ((msg.transfer?.amount || 0) / 100).toFixed(2);
  const isReceived = msg.transfer?.isReceived || false;
  const w = Math.round(180 * scale);
  const p = Math.round(12 * scale);
  return `<div style="background:#fff;border-radius:${Math.round(10*scale)}px;width:${w}px;overflow:hidden;border:1px solid #e0e0e0;">
    <div style="background:#f5f5f5;padding:${p}px;display:flex;align-items:center;gap:${Math.round(10*scale)}px;">
      <div style="width:${Math.round(40*scale)}px;height:${Math.round(40*scale)}px;background:#07c160;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:${Math.round(18*scale)}px;">¥</div>
      <div><div style="font-size:${Math.round(13*scale)}px;color:#333;">转账</div><div style="font-weight:bold;font-size:${Math.round(18*scale)}px;color:#333;">¥${amount}</div></div>
    </div>
    <div style="background:#f8f8f8;padding:${Math.round(8*scale)}px;text-align:center;border-top:1px solid #e0e0e0;font-size:${Math.round(12*scale)}px;color:${isReceived?'#07c160':'#999'};">${isReceived?'已收款':'待收款'}</div>
  </div>`;
}

function createVoiceHtml(msg: Message, isUser: boolean, darkMode: boolean, styles: any, scale: number): string {
  const bg = isUser ? (darkMode ? '#128400' : styles.bubbleRightBg || '#95ec69') : (darkMode ? '#2d2d2d' : styles.bubbleLeftBg || '#ffffff');
  const color = isUser ? '#fff' : '#333';
  const duration = msg.voice?.duration || 0;
  const text = msg.voice?.text ? escapeHtml(msg.voice.text) : '';
  const bw = Math.max(Math.round(120 * scale), Math.round(60 * scale + duration * 8 * scale));
  const p = Math.round(10 * scale);
  const bars = [0,1,2,3,4,5,6,7].map(i => {
    const h = Math.round((8 + Math.sin(i * 0.8) * 6) * scale);
    return `<div style="width:${Math.round(3*scale)}px;height:${h}px;background:${color};opacity:0.6;border-radius:1px;"></div>`;
  }).join('');
  return `<div>
    <div style="background:${bg};border-radius:${Math.round(18*scale)}px;padding:${p}px ${Math.round(12*scale)}px;display:inline-flex;align-items:center;gap:${Math.round(6*scale)}px;min-width:${bw}px;">
      <span style="color:${color};font-size:${Math.round(14*scale)}px;">▶</span>
      <div style="display:flex;align-items:center;gap:${Math.round(2*scale)}px;">${bars}</div>
      <span style="color:${color};font-size:${Math.round(12*scale)}px;opacity:0.8;">${duration}"</span>
    </div>
    ${text ? `<div style="margin-top:${Math.round(4*scale)}px;font-size:${Math.round(13*scale)}px;color:${darkMode?'#aaa':'#666'};">${text}</div>` : ''}
  </div>`;
}

function createImageHtml(msg: Message, scale: number): string {
  const size = Math.round(180 * scale);
  const r = Math.round(12 * scale);
  if (msg.image?.url) {
    return `<img src="${msg.image.url}" crossorigin="anonymous" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:${r}px;display:block;" />`;
  }
  return `<div style="width:${size}px;height:${size}px;background:#e0e0e0;border-radius:${r}px;display:flex;align-items:center;justify-content:center;font-size:${Math.round(40*scale)}px;">📷</div>`;
}

function createFileHtml(msg: Message, scale: number): string {
  const file = msg.file;
  if (!file) return '';
  const ext = (file.type || '').toUpperCase();
  const iconColor = ext === 'PDF' ? '#E53935' : ext === 'DOCX' || ext === 'DOC' ? '#1565C0' : ext === 'XLSX' || ext === 'XLS' ? '#2E7D32' : '#757575';
  const p = Math.round(10 * scale);
  const iconSize = Math.round(36 * scale);
  const nameFontSize = Math.round(13 * scale);
  const sizeFontSize = Math.round(11 * scale);
  const r = Math.round(10 * scale);
  return `<div style="display:flex;align-items:center;gap:${p}px;padding:${p}px;background:#FFFFFF;border:1px solid #E0E0E0;border-radius:${r}px;min-width:${Math.round(200*scale)}px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="width:${iconSize}px;height:${iconSize}px;background:${iconColor};border-radius:${Math.round(4*scale)}px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff;font-weight:bold;font-size:${Math.round(9*scale)}px;">${ext.slice(0,4)}</div>
    <div style="flex:1;min-width:0;">
      <div style="font-size:${nameFontSize}px;color:#1A1A1A;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(file.name)}</div>
      <div style="font-size:${sizeFontSize}px;color:#888;margin-top:${Math.round(2*scale)}px;">${escapeHtml(file.size)}</div>
    </div>
  </div>`;
}

function createQuoteHtml(quote: Message['quote'], scale: number): string {
  if (!quote) return '';
  const fontSize = Math.round(11 * scale);
  const p = Math.round(6 * scale);
  return `<div style="display:flex;gap:${p}px;margin-bottom:${Math.round(6*scale)}px;padding:${Math.round(4*scale)}px ${p}px;background:rgba(0,0,0,0.05);border-radius:${Math.round(4*scale)}px;border-left:${Math.round(3*scale)}px solid #C9C9C9;">
    <div style="flex:1;min-width:0;">
      <div style="font-size:${fontSize}px;color:#888;font-weight:bold;margin-bottom:2px;">${escapeHtml(quote.sender)}</div>
      <div style="font-size:${fontSize}px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(quote.content)}</div>
    </div>
  </div>`;
}

function createMessageHtml(
  msg: Message,
  isUser: boolean,
  darkMode: boolean,
  styles: any,
  scale: number,
  visibleContent: string,
  userAvatarMap: Map<string, string>
): string {
  const avatarSize = Math.round((styles.avatarSize || 40) * scale);
  const gap = Math.round(8 * scale);
  const padding = Math.round(10 * scale);
  const senderFontSize = Math.round(12 * scale);

  if (msg.type === 'system') {
    const systemText = escapeHtml(msg.system?.text || msg.content || '');
    return `<div style="text-align:center;margin:${gap}px 0;"><span style="background:${darkMode?'#333':'#f0f0f0'};color:#888;font-size:${Math.round(12*scale)}px;padding:${Math.round(4*scale)}px ${Math.round(12*scale)}px;border-radius:${Math.round(10*scale)}px;display:inline-block;">${systemText}</span></div>`;
  }

  let contentHtml = '';
  if (msg.type === 'redpacket') {
    contentHtml = createRedPacketHtml(msg, scale);
  } else if (msg.type === 'transfer') {
    contentHtml = createTransferHtml(msg, scale);
  } else if (msg.type === 'image') {
    contentHtml = createImageHtml(msg, scale);
  } else if (msg.type === 'voice') {
    contentHtml = createVoiceHtml(msg, isUser, darkMode, styles, scale);
  } else if (msg.type === 'file') {
    contentHtml = createFileHtml(msg, scale);
  } else {
    // 文字消息：使用 visibleContent（支持打字动画），在气泡内顶部加引用块
    const quoteHtml = createQuoteHtml(msg.quote, scale);
    contentHtml = createTextBubbleHtml(quoteHtml + renderTextWithEmoji(escapeHtml(visibleContent)), isUser, darkMode, styles, scale);
  }

  const avatarHtml = createAvatarHtml(msg.sender, avatarSize, userAvatarMap.get(msg.sender));
  const flexDir = isUser ? 'row-reverse' : 'row';
  const marginL = isUser ? gap : 0;
  const marginR = isUser ? 0 : gap;
  const senderAlign = isUser ? 'right' : 'left';

  return `<div style="display:flex;flex-direction:${flexDir};align-items:flex-start;margin-bottom:${gap}px;padding:0 ${padding}px;">
    ${avatarHtml}
    <div style="margin-left:${marginL}px;margin-right:${marginR}px;max-width:65%;">
      <div style="font-size:${senderFontSize}px;color:#888;margin-bottom:${Math.round(4*scale)}px;text-align:${senderAlign};">${escapeHtml(msg.sender)}</div>
      ${contentHtml}
    </div>
  </div>`;
}

function buildPageHtml(
  visibleMessages: Message[],
  typingProgress: Map<string, { text: string; isTyping: boolean }>,
  darkMode: boolean,
  styles: any,
  width: number,
  height: number,
  scrollTop: number,
  userAvatarMap: Map<string, string>
): string {
  const scale = width / 375;
  const avatarSize = Math.round((styles.avatarSize || 40) * scale);
  const fontSize = Math.round((styles.fontSize || 16) * scale);
  const headerHeight = avatarSize + Math.round(8 * scale);
  const statusBarHeight = width < height ? Math.round(24 * scale) : 0;
  const totalHeaderHeight = headerHeight + statusBarHeight;
  const contentPadding = Math.round(10 * scale);

  const headerBg = darkMode ? '#2d2d2d' : (styles.headerBg || '#f5f5f5');
  const headerColor = darkMode ? '#fff' : (styles.headerColor || '#1a1a1a');
  const contentBg = darkMode ? '#1f1f1f' : (styles.background || '#f5f5f5');

  let messagesHtml = '';
  for (const msg of visibleMessages) {
    const isUser = msg.role === 'user';
    const state = typingProgress.get(msg.id);
    const visibleContent = state?.text ?? msg.content ?? '';
    messagesHtml += createMessageHtml(msg, isUser, darkMode, styles, scale, visibleContent, userAvatarMap);
  }

  const statusBarHtml = statusBarHeight > 0 ? `
    <div style="height:${statusBarHeight}px;background:${headerBg};display:flex;align-items:center;justify-content:space-between;padding:0 ${Math.round(8*scale)}px;color:${darkMode?'#888':'#666'};font-size:${Math.round(10*scale)}px;flex-shrink:0;">
      <span>10:30</span><span>📶 🔋</span>
    </div>` : '';

  return `<div style="width:${width}px;height:${height}px;background:${contentBg};font-family:'Microsoft YaHei','PingFang SC',sans-serif;overflow:hidden;position:relative;">
    ${statusBarHtml}
    <div style="height:${headerHeight}px;background:${headerBg};display:flex;align-items:center;justify-content:center;color:${headerColor};font-size:${fontSize}px;font-weight:bold;">
      ${escapeHtml(styles.title || 'Chat')}
    </div>
    <div style="position:absolute;top:${totalHeaderHeight}px;left:0;right:0;bottom:0;overflow:hidden;">
      <div id="dom-messages-wrapper" style="transform:translateY(-${scrollTop}px);padding:${contentPadding}px;">
        ${messagesHtml}
      </div>
    </div>
  </div>`;
}

export class DOMTypingRenderer {
  private ffmpeg: FFmpeg | null = null;
  private loaded: boolean = false;
  private container: HTMLDivElement | null = null;

  async init(): Promise<void> {
    if (this.loaded) return;
    this.ffmpeg = new FFmpeg();
    this.ffmpeg.on('log', ({ message }) => console.log('[DOMRenderer]', message));
    this.ffmpeg.on('progress', ({ progress }) => console.log('[DOMRenderer]', Math.round(progress * 100), '%'));
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
    users: UserProfile[] = [],
    darkMode: boolean = false,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    if (!this.loaded) await this.init();

    const ffmpeg = this.ffmpeg!;
    const fps = exportConfig.fps || 30;
    const frameInterval = 1000 / fps;
    const messageInterval = 1500;
    const width = exportConfig.width;
    const height = exportConfig.height;
    const styles = { ...exportConfig.styles, width, height };

    // 构建用户头像 map
    const userAvatarMap = new Map<string, string>();
    for (const user of users) {
      if (user.avatar) userAvatarMap.set(user.name, user.avatar);
    }

    onProgress?.(5);
    await document.fonts.ready;
    onProgress?.(10);

    // 确保离屏容器存在
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.style.cssText = 'position:absolute;left:-9999px;top:0;z-index:-1;';
      document.body.appendChild(this.container);
    }

    // 生成打字序列
    const sequences = new Map<string, MessageTypingSequence>();
    if (config.enabled && !config.fastMode) {
      for (const msg of messages) {
        if (msg.type !== 'system' && msg.type === 'text') {
          sequences.set(msg.id, generateTypingSequence(msg, config));
        }
      }
    }

    // 计算时长
    const estimatedMs = estimateDuration(messages, config) * 1000;
    const speedMultiplier = calculateSpeedMultiplier(estimatedMs / 1000, config.targetDuration);

    let totalDuration = 0;
    const msgTimings: { appearTime: number; typingDuration: number }[] = [];
    for (const msg of messages) {
      const appearTime = totalDuration;
      let typingDuration: number;
      if (msg.type === 'system') {
        typingDuration = 500 / speedMultiplier;
      } else if (msg.type !== 'text') {
        typingDuration = 800 / speedMultiplier;
      } else {
        const seq = sequences.get(msg.id);
        typingDuration = seq ? seq.totalDuration / speedMultiplier : (config.fastMode ? 100 : config.baseSpeed * (msg.content?.length || 10)) / speedMultiplier;
      }
      msgTimings.push({ appearTime, typingDuration });
      totalDuration = appearTime + typingDuration + messageInterval / speedMultiplier;
    }
    totalDuration += 2000 / speedMultiplier;
    const finalDuration = Math.max(totalDuration, 5000);

    // 预测内容总高度（用于满屏滚动）
    const scale = width / 375;
    const avatarSize = Math.round((styles.avatarSize || 40) * scale);
    const headerHeight = avatarSize + Math.round(8 * scale);
    const statusBarHeight = width < height ? Math.round(24 * scale) : 0;
    const contentPadding = Math.round(10 * scale);
    const visibleContentHeight = height - headerHeight - statusBarHeight - contentPadding * 2;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const totalFrames = Math.ceil(finalDuration / frameInterval);
    let frameIndex = 0;

    const visibleMessages: Message[] = [];
    let currentMsgIndex = 0;

    for (let t = 0; t <= finalDuration; t += frameInterval) {
      // 推进消息出现
      while (currentMsgIndex < messages.length && t >= msgTimings[currentMsgIndex].appearTime) {
        visibleMessages.push(messages[currentMsgIndex]);
        currentMsgIndex++;
      }

      // 计算每条消息的打字进度
      const typingProgress = new Map<string, { text: string; isTyping: boolean }>();
      const fullProgress = new Map<string, { text: string; isTyping: boolean }>();

      for (let i = 0; i < visibleMessages.length; i++) {
        const msg = visibleMessages[i];
        const timing = msgTimings[i];
        const elapsed = t - timing.appearTime;

        if (msg.type === 'system' || msg.type !== 'text') {
          typingProgress.set(msg.id, { text: msg.content || '', isTyping: false });
        } else if (sequences.has(msg.id)) {
          const seq = sequences.get(msg.id)!;
          const result = getVisibleContentAtTime(seq, elapsed * speedMultiplier);
          typingProgress.set(msg.id, { text: result.text, isTyping: result.isTyping });
        } else {
          typingProgress.set(msg.id, { text: msg.content || '', isTyping: false });
        }
        fullProgress.set(msg.id, { text: msg.content || '', isTyping: false });
      }

      // 满屏后才滚动：渲染完整内容后测量实际高度
      this.container.innerHTML = buildPageHtml(visibleMessages, fullProgress, darkMode, styles, width, height, 0, userAvatarMap);
      await new Promise(resolve => requestAnimationFrame(resolve));
      const contentWrapper = this.container.querySelector('#dom-messages-wrapper') as HTMLElement | null;
      const actualContentH = contentWrapper ? contentWrapper.scrollHeight : 0;
      const scrollTop = Math.max(0, actualContentH - visibleContentHeight);

      // 渲染 DOM
      this.container.innerHTML = buildPageHtml(visibleMessages, typingProgress, darkMode, styles, width, height, scrollTop, userAvatarMap);

      await new Promise(resolve => requestAnimationFrame(resolve));

      try {
        const htmlCanvas = await html2canvas(this.container.firstElementChild as HTMLElement, {
          backgroundColor: darkMode ? '#1f1f1f' : (styles.background || '#f5f5f5'),
          scale: 1,
          logging: false,
          useCORS: true,
          allowTaint: true,
          width,
          height,
        });
        ctx.drawImage(htmlCanvas, 0, 0, width, height);
      } catch {
        ctx.fillStyle = darkMode ? '#1f1f1f' : '#f5f5f5';
        ctx.fillRect(0, 0, width, height);
      }

      // 同步写帧
      const dataUrl = canvas.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1];
      const binaryStr = atob(base64);
      const uint8Array = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) uint8Array[i] = binaryStr.charCodeAt(i);
      const filename = `frame${String(frameIndex).padStart(5, '0')}.png`;
      await ffmpeg.writeFile(filename, uint8Array);
      frameIndex++;

      onProgress?.(Math.min(10 + Math.round((frameIndex / totalFrames) * 70), 80));
    }

    onProgress?.(80);

    await ffmpeg.exec(['-framerate', String(fps), '-i', 'frame%05d.png', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'fast', '-y', 'output.mp4']);

    onProgress?.(95);

    const data = await ffmpeg.readFile('output.mp4');
    const videoBlob = new Blob([data as BlobPart], { type: 'video/mp4' });

    for (let i = 0; i < frameIndex; i++) await ffmpeg.deleteFile(`frame${String(i).padStart(5, '0')}.png`).catch(() => {});
    await ffmpeg.deleteFile('output.mp4').catch(() => {});

    onProgress?.(100);
    return videoBlob;
  }

  getEstimatedDuration(messages: Message[], config: TypingAnimationConfig): number {
    return estimateDuration(messages, config);
  }
}

export const domTypingRenderer = new DOMTypingRenderer();
