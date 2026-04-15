import type { Message } from '@/types';
import type { TypingAnimationConfig } from './types';
import { generateTypingSequence, estimateDuration } from './generators';
import { DEFAULT_TYPING_CONFIG } from './config';

export interface DebugPreviewOptions {
  messages: Message[];
  config?: TypingAnimationConfig;
  width?: number;
  height?: number;
}

export function generateDebugHtml(options: DebugPreviewOptions): string {
  const {
    messages,
    config = DEFAULT_TYPING_CONFIG,
    width = 375,
    height = 667,
  } = options;

  const avatarSize = 40;
  const fontSize = 16;
  const bubblePadding = 12;
  const bubbleRadius = 18;
  const gap = 8;
  const headerHeight = avatarSize + 8;
  const senderNameHeight = Math.round(avatarSize * 0.33);
  const lineHeight = Math.round(fontSize * 1.4);
  const contentPadding = gap;

  const INITIAL_DELAY = 500;
  const MSG_WAIT = 1500;
  const totalDuration = estimateDuration(messages, config) * 1000 + messages.length * MSG_WAIT + INITIAL_DELAY + 2000;
  const fps = 30;
  const frameInterval = 1000 / fps;

  const firstTimestamp = messages[0]?.timestamp || 0;
  const normalizedMessages = messages.map((msg) => ({
    id: msg.id,
    content: msg.content || '',
    sender: msg.sender || 'Unknown',
    role: msg.role || 'assistant',
    type: msg.type || 'text',
    timestamp: (msg.timestamp || 0) - firstTimestamp + INITIAL_DELAY,
    redPacket: msg.redPacket,
    transfer: msg.transfer,
    voice: msg.voice,
    image: msg.image,
    system: msg.system,
  }));

  const sequences: { id: string; events: { type: string; timestamp: number; content?: string }[]; totalDuration: number }[] = [];
  for (const msg of messages) {
    const content = msg.content || '';
    if (content && msg.type !== 'system') {
      const seq = generateTypingSequence(msg, config);
      sequences.push({
        id: msg.id,
        events: seq.events,
        totalDuration: seq.totalDuration,
      });
    }
  }

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Typing Animation Debug Preview</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
      background: #1a1a1a;
      color: #fff;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
    }
    h1 { font-size: 18px; margin-bottom: 16px; }
    .controls {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
    }
    .controls label { display: flex; align-items: center; gap: 6px; font-size: 14px; color: #aaa; }
    .controls input[type="range"] { width: 200px; }
    .controls button {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      background: #6366f1;
      color: #fff;
      cursor: pointer;
      font-size: 14px;
    }
    .controls button:hover { background: #4f46e5; }
    .controls button.active { background: #22c55e; }
    .controls select {
      padding: 6px 10px;
      border: none;
      border-radius: 6px;
      background: #333;
      color: #fff;
      font-size: 14px;
    }
    .frame-info { font-size: 14px; color: #888; min-width: 200px; }
    .preview-container {
      background: #f5f5f5;
      border-radius: 12px;
      overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      max-height: 90vh;
    }
    canvas { 
      display: block; 
      background: #f5f5f5;
    }
    .error { background: #7f1d1d; padding: 12px; border-radius: 8px; margin-bottom: 16px; max-width: 500px; display: none; }
    .error.show { display: block; }
  </style>
</head>
<body>
  <h1>Typing Animation Debug Preview</h1>
  
  <div class="error" id="errorBox"></div>

  <div class="controls">
    <button id="playBtn">▶ Play</button>
    <button id="pauseBtn">⏸ Pause</button>
    <label>
      Frame: <input type="range" id="slider" min="0" max="${Math.ceil(totalDuration / frameInterval)}" value="0">
    </label>
    <label>
      Speed: <select id="speedSelect">
        <option value="0.5">0.5x</option>
        <option value="1" selected>1x</option>
        <option value="2">2x</option>
        <option value="4">4x</option>
      </select>
    </label>
    <span class="frame-info" id="frameInfo">0 / ${Math.ceil(totalDuration / frameInterval)}</span>
  </div>

  <div class="preview-container" id="previewContainer">
    <canvas id="canvas" width="${width * 2}" height="${height * 2}" style="width: ${width}px; height: ${height}px;"></canvas>
  </div>

  <script>
(function() {
  const W = ${width};
  const H = ${height};
  const AVATAR = ${avatarSize};
  const FONT = ${fontSize};
  const PAD = ${bubblePadding};
  const RADIUS = ${bubbleRadius};
  const GAP = ${gap};
  const HH = ${headerHeight};
  const LH = ${lineHeight};
  const SENDER_H = ${senderNameHeight};
  const CONTENT_PAD = ${contentPadding};
  const MAX_W = W - AVATAR * 2 - CONTENT_PAD * 2 - GAP * 2;
  const TOTAL = ${totalDuration};
  const FI = ${frameInterval};
  const INIT = ${INITIAL_DELAY};
  const MSG_WAIT = 1500;
  const FAST = ${config.fastMode || false};

  const MSGS = ${JSON.stringify(normalizedMessages)};
  console.log('MSGS:', MSGS.length, 'messages');
  const SEQ_MAP = {};
  const SEQ_RAW = ${JSON.stringify(sequences)};
  SEQ_RAW.forEach(function(s) { SEQ_MAP[s.id] = s; });

  // 图片缓存
  const imageCache = {};

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);

  const avatarColors = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ef4444', '#f97316', '#eab308', '#22c55e'];

  let isPlaying = false;
  let playSpeed = 1;
  let startTime = 0;
  let pausedTime = 0;
  let currentTime = 0;
  let animId = null;

  let currentIdx = 0;
  const visibleMsgs = [];
  const msgElapsed = {};
  let nextMsgTime = INIT; // 下一条消息应该出现的时间

  function getColor(name) {
    let hash = 0;
    for (var i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return avatarColors[Math.abs(hash) % avatarColors.length];
  }

  function getInitials(name) {
    return name ? name.slice(0, 2).toUpperCase() : '??';
  }

  function wrapText(text, maxW) {
    ctx.font = FONT + 'px "Microsoft YaHei", sans-serif';
    var lines = [];
    var line = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var test = line + ch;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = ch;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }

  function getText(msgId, elapsed) {
    var seq = SEQ_MAP[msgId];
    if (!seq || FAST) return { text: '', typing: false };
    var text = '';
    var last = null;
    for (var i = 0; i < seq.events.length; i++) {
      var e = seq.events[i];
      if (e.timestamp > elapsed) break;
      if (e.type === 'char' || e.type === 'emoji') { text += e.content || ''; last = e; }
      else if (e.type === 'backspace') { text = text.slice(0, -1); }
    }
    var typing = last && (elapsed - last.timestamp) < 500;
    return { text: text, typing: typing };
  }

  function drawAvatar(x, y, size, name) {
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = getColor(name);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + (size * 0.38) + 'px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(getInitials(name), x + size / 2, y + size / 2 + 2);
  }

  function drawBubble(x, y, w, h, r, bgColor) {
    var rr = Math.min(r, w / 2, h / 2);
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

  function drawSenderName(x, y, name, align) {
    ctx.fillStyle = '#888888';
    ctx.font = (FONT * 0.7) + 'px "Microsoft YaHei", sans-serif';
    ctx.textAlign = align;
    ctx.textBaseline = 'bottom';
    ctx.fillText(name, x, y);
  }

  function drawText(text, x, y, maxW, color, isUser) {
    ctx.fillStyle = color;
    ctx.font = FONT + 'px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.textBaseline = 'top';
    var lines = wrapText(text, maxW);
    var totalTextH = lines.length * LH;
    var startY = y;
    
    for (var i = 0; i < lines.length; i++) {
      ctx.textAlign = 'left';
      ctx.fillText(lines[i], x, startY + i * LH);
    }
  }

  function drawRedPacket(x, y, w, h, rp, isOpened) {
    var iconSize = 48;
    var bodyH = h - 32;
    var r = Math.min(RADIUS, w / 2, bodyH / 2);
    
    // 绘制圆角矩形主体（渐变橙色）
    var gradient = ctx.createLinearGradient(x, y, x + w, y + bodyH);
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
    
    // 绘制钱袋图标（黄色圆形）
    var iconX = x + PAD;
    var iconY = y + (bodyH - iconSize) / 2;
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // 钱袋图标内文字
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + (iconSize * 0.5) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧧', iconX + iconSize / 2, iconY + iconSize / 2);
    
    // 标题"红包"
    var contentX = iconX + iconSize + 12;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('红包', contentX, iconY + 6);
    
    // 祝福语
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '12px "Microsoft YaHei", sans-serif';
    ctx.fillText(rp.greeting || '恭喜发财', contentX, iconY + 26);
    
    // 底部状态栏
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillRect(x, y + bodyH, w, 32);
    
    // 分割线
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y + bodyH);
    ctx.lineTo(x + w, y + bodyH);
    ctx.stroke();
    
    // 状态文字
    ctx.fillStyle = '#999';
    ctx.font = '11px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var statusText = isOpened ? ('已领取 ¥' + (rp.amount / 100).toFixed(2)) : '领取红包';
    ctx.fillText(statusText, x + w / 2, y + bodyH + 16);
  }

  function drawTransfer(x, y, w, h, tf, isReceived) {
    var iconSize = 44;
    var bodyH = h - 32;
    var r = Math.min(RADIUS, w / 2, bodyH / 2);
    
    // 绘制主体区域（灰色背景）
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
    
    // 绘制转账图标（绿色圆形）
    var iconX = x + PAD;
    var iconY = y + (bodyH - iconSize) / 2;
    ctx.fillStyle = '#07c160';
    ctx.beginPath();
    ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // 图标内文字 "¥"
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + (iconSize * 0.45) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('¥', iconX + iconSize / 2, iconY + iconSize / 2);
    
    // 标题"转账"
    var contentX = iconX + iconSize + 12;
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('转账', contentX, iconY + 4);
    
    // 金额
    ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
    ctx.fillText('¥' + (tf.amount / 100).toFixed(2), contentX, iconY + 24);
    
    // 底部状态栏
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y + bodyH, w, 32);
    
    // 分割线
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y + bodyH);
    ctx.lineTo(x + w, y + bodyH);
    ctx.stroke();
    
    // 状态文字
    ctx.fillStyle = isReceived ? '#07c160' : '#999';
    ctx.font = '11px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isReceived ? '已收款' : '待收款', x + w / 2, y + bodyH + 16);
  }

  function drawVoice(x, y, w, h, voice, bubbleColor) {
    var iconSize = 14;
    var waveAreaH = 40;
    var textColor = '#333';
    
    drawBubble(x, y, w, h, RADIUS, bubbleColor);
    
    ctx.fillStyle = bubbleColor === '#95ec69' ? '#fff' : '#333';
    ctx.beginPath();
    ctx.moveTo(x + PAD, y + (waveAreaH - iconSize) / 2);
    ctx.lineTo(x + PAD, y + (waveAreaH + iconSize) / 2);
    ctx.lineTo(x + PAD + iconSize, y + waveAreaH / 2);
    ctx.closePath();
    ctx.fill();
    
    var waveX = x + PAD + iconSize + 8;
    ctx.fillStyle = bubbleColor === '#95ec69' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.3)';
    for (var i = 0; i < 8; i++) {
      var barH = (Math.sin(i * 0.8) * 0.5 + 0.5) * 16 + 4;
      ctx.fillRect(waveX + i * 5, y + (waveAreaH - barH) / 2, 3, barH);
    }
    
    ctx.fillStyle = bubbleColor === '#95ec69' ? '#fff' : '#999';
    ctx.font = '12px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(voice.duration + '"', x + w - PAD - 40, y + waveAreaH / 2);
    
    if (voice.text) {
      var textY = y + waveAreaH + PAD;
      ctx.fillStyle = textColor;
      ctx.font = FONT + 'px "Microsoft YaHei", sans-serif';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      var lines = wrapText(voice.text, w - PAD * 2);
      for (var li = 0; li < lines.length && textY + li * LH < y + h - PAD; li++) {
        ctx.fillText(lines[li], x + PAD, textY + li * LH);
      }
    }
  }

  function drawImage(x, y, w, h, img) {
    var imgPad = 4;
    var imgSize = Math.min(w - imgPad * 2, h - imgPad * 2);
    
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
    
    if (img && img.url) {
      // 使用缓存的图片
      if (!imageCache[img.url]) {
        var tempImg = new Image();
        tempImg.crossOrigin = 'anonymous';
        tempImg.src = img.url;
        imageCache[img.url] = tempImg;
      }
      var cachedImg = imageCache[img.url];
      if (cachedImg.complete && cachedImg.naturalWidth > 0) {
        var scale = Math.min(imgSize / cachedImg.naturalWidth, imgSize / cachedImg.naturalHeight);
        var drawW = cachedImg.naturalWidth * scale;
        var drawH = cachedImg.naturalHeight * scale;
        var drawX = x + (w - drawW) / 2;
        var drawY = y + (h - drawH) / 2;
        ctx.drawImage(cachedImg, drawX, drawY, drawW, drawH);
      }
    } else {
      ctx.fillStyle = '#ccc';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#999';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('📷', x + w / 2, y + h / 2);
    }
    
    ctx.restore();
    
    if (img && img.caption) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x, y + h - 24, w, 24);
      ctx.fillStyle = '#fff';
      ctx.font = '12px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(img.caption, x + w / 2, y + h - 12);
    }
  }

  function drawSystemMessage(x, y, w, text, type) {
    var styles = {
      recall: { bg: '#f5f5f5', color: '#999' },
      pat: { bg: '#fff8e1', color: '#ff9800' },
      default: { bg: '#f0f0f0', color: '#666' }
    };
    var s = styles[type] || styles.default;
    
    ctx.font = '12px "Microsoft YaHei", sans-serif';
    var textW = ctx.measureText(text).width;
    var boxW = textW + 40;
    var boxX = (W - boxW) / 2;
    
    ctx.fillStyle = s.bg;
    ctx.beginPath();
    ctx.roundRect(boxX, y, boxW, 28, 14);
    ctx.fill();
    
    ctx.fillStyle = s.color;
    ctx.font = 'italic 12px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, W / 2, y + 14);
    
    return 28;
  }

  function render(t) {
    var effT = Math.max(0, t - INIT);

    if (currentIdx < MSGS.length) {
      if (currentIdx >= visibleMsgs.length) {
        if (effT >= nextMsgTime || t >= TOTAL) {
          visibleMsgs.push(MSGS[currentIdx]);
          msgElapsed[MSGS[currentIdx].id] = effT;
          var seq = SEQ_MAP[MSGS[currentIdx].id];
          var msgDuration = seq && !FAST ? (seq.totalDuration || 500) : 200;
          nextMsgTime = effT + msgDuration + MSG_WAIT;
          currentIdx++;
        }
      }
    }

    // 动画结束时显示所有消息
    if (t >= TOTAL) {
      while (currentIdx < MSGS.length) {
        if (currentIdx >= visibleMsgs.length) {
          visibleMsgs.push(MSGS[currentIdx]);
        }
        currentIdx++;
      }
    }

    // 计算所需高度
    var totalY = HH + CONTENT_PAD;
    for (var calcIdx = 0; calcIdx < visibleMsgs.length; calcIdx++) {
      var calcMsg = visibleMsgs[calcIdx];
      var calcText = calcMsg.content || '';
      var calcBubbleH = 40;
      if (calcMsg.type === 'redpacket') calcBubbleH = 102;
      else if (calcMsg.type === 'transfer') calcBubbleH = 120;
      else if (calcMsg.type === 'voice') {
        if (calcMsg.voice && calcMsg.voice.text) {
          ctx.font = FONT + 'px "Microsoft YaHei", sans-serif';
          var vLines = wrapText(calcMsg.voice.text, MAX_W - PAD * 2);
          calcBubbleH = 40 + vLines.length * LH + PAD * 2;
        } else {
          calcBubbleH = 40;
        }
      }
      else if (calcMsg.type === 'image') calcBubbleH = 180;
      else {
        ctx.font = FONT + 'px "Microsoft YaHei", sans-serif';
        var calcLines = wrapText(calcText, MAX_W - PAD * 2);
        calcBubbleH = calcLines.length * LH + PAD * 2;
      }
      var rowH = Math.max(AVATAR, SENDER_H + calcBubbleH) + GAP;
      totalY += rowH;
    }
    totalY += CONTENT_PAD;

    // 动态调整canvas高度
    var actualH = Math.max(H, totalY);
    var needsReset = canvas.height !== actualH * 2;
    if (needsReset) {
      canvas.height = actualH * 2;
      canvas.style.height = actualH + 'px';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(2, 2);
    }

    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, W, actualH);
    ctx.fillRect(0, 0, W, HH);
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Chat', W / 2, HH / 2);

    var y = HH + CONTENT_PAD;
    
    for (var i = 0; i < visibleMsgs.length; i++) {
      var m = visibleMsgs[i];
      var el = effT;
      var isUser = m.role === 'user';
      var bubbleBg = isUser ? '#95ec69' : '#fff';
      var bubbleColor = '#333';

      var ax = isUser ? W - CONTENT_PAD - AVATAR : CONTENT_PAD;
      var ay = y;

      drawAvatar(ax, ay, AVATAR, m.sender);

      var text = m.content || '';
      if (SEQ_MAP[m.id] && !FAST && m.type !== 'system') {
        var result = getText(m.id, el);
        text = result.text;
      }

      ctx.font = FONT + 'px "Microsoft YaHei", sans-serif';

      if (m.type === 'system' && m.system) {
        y += drawSystemMessage(ax, ay, W - CONTENT_PAD * 2, m.system.text || '', m.system.type) + GAP;
        continue;
      }

      var senderX = isUser ? ax - GAP : ax + AVATAR + GAP;
      var senderAlign = isUser ? 'right' : 'left';
      drawSenderName(senderX, ay + SENDER_H, m.sender, senderAlign);

      var bubbleY = ay + SENDER_H;
      var bubbleX, bubbleW, bubbleH;
      
      if (m.type === 'redpacket') {
        bubbleW = 180;
        bubbleH = 102;
        bubbleX = isUser ? ax - GAP - bubbleW : ax + AVATAR + GAP;
        drawRedPacket(bubbleX, bubbleY, bubbleW, bubbleH, m.redPacket, m.redPacket.isOpened);
      } else if (m.type === 'transfer') {
        bubbleW = 180;
        bubbleH = 120;
        bubbleX = isUser ? ax - GAP - bubbleW : ax + AVATAR + GAP;
        drawTransfer(bubbleX, bubbleY, bubbleW, bubbleH, m.transfer, m.transfer.isReceived);
      } else if (m.type === 'voice') {
        bubbleW = Math.max(120, 60 + (m.voice?.duration || 5) * 10);
        // 根据语音转文字内容计算高度
        if (m.voice && m.voice.text) {
          ctx.font = FONT + 'px "Microsoft YaHei", sans-serif';
          var voiceLines = wrapText(m.voice.text, bubbleW - PAD * 2);
          var voiceTextH = voiceLines.length * LH;
          bubbleH = 40 + voiceTextH + PAD * 2; // 波形40 + 文字区域 + padding
        } else {
          bubbleH = 40;
        }
        bubbleX = isUser ? ax - GAP - bubbleW : ax + AVATAR + GAP;
        drawVoice(bubbleX, bubbleY, bubbleW, bubbleH, m.voice, bubbleBg);
      } else if (m.type === 'image') {
        bubbleW = 180;
        bubbleH = 180;
        bubbleX = isUser ? ax - GAP - bubbleW : ax + AVATAR + GAP;
        drawImage(bubbleX, bubbleY, bubbleW, bubbleH, m.image);
      } else {
        // 计算文字尺寸 - 先确定气泡宽度，再计算换行
        var maxLineWidth = ctx.measureText(text).width;
        bubbleW = Math.min(MAX_W, Math.max(maxLineWidth + PAD * 2, 60));
        var textContentW = bubbleW - PAD * 2;
        var textLines = wrapText(text, textContentW);
        var textH = textLines.length * LH;
        
        // 重新测量换行后的最大行宽
        maxLineWidth = 0;
        for (var li = 0; li < textLines.length; li++) {
          maxLineWidth = Math.max(maxLineWidth, ctx.measureText(textLines[li]).width);
        }
        
        // 根据实际内容调整气泡宽度
        bubbleW = Math.min(MAX_W, Math.max(maxLineWidth + PAD * 2, 60));
        textContentW = bubbleW - PAD * 2;
        
        bubbleH = textH + PAD * 2;
        bubbleX = isUser ? ax - GAP - bubbleW : ax + AVATAR + GAP;
        
        drawBubble(bubbleX, bubbleY, bubbleW, bubbleH, RADIUS, bubbleBg);
        
        // 文字绘制 - 垂直居中
        var textX = bubbleX + PAD;
        var textY = bubbleY + (bubbleH - textH) / 2;
        
        ctx.fillStyle = bubbleColor;
        ctx.font = FONT + 'px "Microsoft YaHei", sans-serif';
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        for (var ti = 0; ti < textLines.length; ti++) {
          ctx.fillText(textLines[ti], textX, textY + ti * LH);
        }
      }

      var rowH = Math.max(AVATAR, SENDER_H + bubbleH) + GAP;
      y += rowH;
    }
    
    // 自动滚动到底部
    var container = document.getElementById('previewContainer');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  function update() {
    var idx = Math.floor(currentTime / FI);
    render(currentTime);
    document.getElementById('slider').value = idx;
    document.getElementById('frameInfo').textContent = idx + ' / ' + Math.ceil(TOTAL / FI) + ' (t=' + Math.round(currentTime) + 'ms)';
  }

  function loop(ts) {
    if (isPlaying) {
      var delta = (ts - startTime) * playSpeed;
      currentTime = pausedTime + delta;
      if (currentTime >= TOTAL) {
        currentTime = TOTAL;
        isPlaying = false;
        document.getElementById('playBtn').textContent = '▶ Play';
        document.getElementById('playBtn').classList.remove('active');
      }
    }
    update();
    animId = requestAnimationFrame(loop);
  }

  document.getElementById('playBtn').addEventListener('click', function() {
    if (isPlaying) {
      pausedTime = currentTime;
      isPlaying = false;
      this.textContent = '▶ Play';
      this.classList.remove('active');
    } else {
      if (currentTime >= TOTAL) {
        currentTime = 0;
        pausedTime = 0;
        currentIdx = 0;
        visibleMsgs.length = 0;
        nextMsgTime = INIT;
      } else {
        pausedTime = currentTime;
      }
      startTime = performance.now();
      isPlaying = true;
      this.textContent = '⏸ Playing...';
      this.classList.add('active');
    }
  });

  document.getElementById('pauseBtn').addEventListener('click', function() {
    pausedTime = currentTime;
    isPlaying = false;
    document.getElementById('playBtn').textContent = '▶ Play';
    document.getElementById('playBtn').classList.remove('active');
  });

  document.getElementById('speedSelect').addEventListener('change', function() {
    playSpeed = parseFloat(this.value);
  });

  document.getElementById('slider').addEventListener('input', function() {
    currentTime = parseInt(this.value) * FI;
    pausedTime = currentTime;
    update();
  });

  update();
  animId = requestAnimationFrame(loop);
})();
  </script>
</body>
</html>`;

  return html;
}

export function downloadDebugHtml(options: DebugPreviewOptions, filename = 'typing-preview.html') {
  const html = generateDebugHtml(options);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function openDebugPreview(options: DebugPreviewOptions) {
  const html = generateDebugHtml(options);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  // 清理 object URL（浏览器会保留 blob 直到窗口关闭，但我们可以尝试在窗口关闭后清理）
  if (win) {
    const cleanup = () => {
      URL.revokeObjectURL(url);
      win.removeEventListener('beforeunload', cleanup);
    };
    win.addEventListener('beforeunload', cleanup);
    // 备用：5秒后清理（如果窗口还在，blob 仍然有效）
    setTimeout(cleanup, 5000);
  } else {
    // 如果窗口被拦截，立即清理
    URL.revokeObjectURL(url);
  }
}
