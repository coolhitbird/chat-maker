# 聊天视频导出功能详细设计文档

**版本**: 2.0  
**日期**: 2026-04-05  
**项目**: chat-maker-v2

---

## 一、概述

聊天视频导出功能允许用户将聊天记录导出为 PNG 图片或 MP4 视频。系统支持五种导出模式，每种模式有不同的视觉效果和性能特点。

### 1.1 导出模式总览

| 模式 | 入口 | 渲染引擎 | 特点 |
|------|------|----------|------|
| 图片导出 | 导出图片按钮 | `canvasRenderer.ts` | 静态 PNG，高清，支持深色模式 |
| 普通视频 | 导出视频（动画关闭） | `exporter.ts` + Canvas | 消息逐条出现，满屏后滚动 |
| 简洁动画 (`simple`) | 导出视频（动画开启） | `VideoExporter.ts` | 逐字打字，高性能 |
| 循环动画 (`loop`) | 导出视频（动画开启） | `LoopRenderer.ts` | 逐字打字 + 光标闪烁 |
| 内容动画 (`content`) | 导出视频（动画开启） | `ContentRenderer.ts` | 逐字打字，内容聚焦 |
| DOM 动画 (`dom`) | 导出视频（动画开启） | `DOMRenderer.ts` | HTML 渲染，保真度最高 |

---

## 二、架构设计

### 2.1 模块结构

```
src/core/
├── canvasRenderer.ts           # 图片导出 + 普通视频帧渲染
├── exporter.ts                 # Exporter 类（FFmpeg 封装、普通视频）
└── typingAnimation/
    ├── index.ts                # 统一导出
    ├── types.ts                # 类型定义（TypingAnimationConfig、ExportConfig 等）
    ├── config.ts               # 默认配置（DEFAULT_TYPING_CONFIG）
    ├── generators/
    │   ├── SequenceGenerator.ts  # 打字序列生成（逐字/粘贴/打错/停顿）
    │   └── ChineseWordSplitter.ts # 中文分词
    ├── renderers/
    │   ├── layoutUtils.ts      # 布局计算（calculateAllLayouts、calculateMessageHeight）
    │   ├── base.ts             # 基础绘制函数（drawTypingText、drawTypingAvatar）
    │   ├── LoopRenderer.ts     # loop 模式
    │   ├── ContentRenderer.ts  # content 模式
    │   └── DOMRenderer.ts      # dom 模式（HTML + html2canvas）
    └── exporters/
        └── VideoExporter.ts    # simple 模式
```

### 2.2 数据流

```
Message[] + TypingAnimationConfig
    ↓
generateTypingSequence() → MessageTypingSequence[]（每条消息的打字事件序列）
    ↓
calculateMessageTimings() → MessageTiming[]（每条消息的出现时间、打字时长）
    ↓
帧循环（t = 0 → totalDuration，步长 = 1000/fps ms）
    ↓
每帧：
  1. 确定当前可见消息列表
  2. 计算每条消息的打字进度（getTypingProgressAtTime）
  3. calculateAllLayouts() → 布局坐标
  4. 计算 scrollOffset（满屏后才滚动）
  5. renderFrame() / renderLayouts() → 绘制到 Canvas
  6. canvas.toDataURL() → Uint8Array → 写入 FFmpeg 虚拟文件系统
    ↓
ffmpeg.exec(['-framerate', fps, '-i', 'frame%05d.png', '-c:v', 'libx264', ...])
    ↓
Video Blob → 下载
```

---

## 三、核心类型定义

### 3.1 Message（消息）

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  sender: string;
  avatar: string;
  content: string;
  type: 'text' | 'redpacket' | 'transfer' | 'voice' | 'image' | 'timestamp' | 'system' | 'file';
  timestamp: number;
  redPacket?: RedPacketData;
  transfer?: TransferData;
  voice?: VoiceData;
  image?: ImageData;
  system?: SystemData;
  file?: FileData;
  quote?: QuoteData;       // 引用/回复消息
  typingCharCount?: number; // 打字动画进度（预览用）
}
```

### 3.2 QuoteData（引用消息）

```typescript
interface QuoteData {
  messageId: string;  // 被引用消息的 id
  sender: string;     // 被引用消息的发送者
  content: string;    // 内容摘要（截断到 30 字符）
  type: MessageType;  // 被引用消息的类型
}
```

### 3.3 SystemData（系统消息）

```typescript
interface SystemData {
  text: string;
  type?: 'info' | 'warning' | 'notification' | 'recall' | 'pat' | 'addFriend' | 'invite' | 'time';
}
```

`time` 类型：微信风格灰色圆角标签，无图标，用于显示时间戳（如"昨天 10:30"）。

### 3.4 TypingEvent（打字事件）

```typescript
interface TypingEvent {
  type: 'char' | 'emoji' | 'backspace' | 'pause' | 'paste-flash';
  content?: string;
  duration: number;   // 持续时间(ms)
  timestamp: number;  // 在序列中的时间戳(ms)
  effect?: 'normal' | 'pop' | 'sparkle' | 'flash' | 'expand';
}
```

### 3.5 TypingAnimationConfig（动画配置）

```typescript
interface TypingAnimationConfig {
  enabled: boolean;
  renderMode: 'simple' | 'loop' | 'content' | 'dom';
  baseSpeed: number;        // 基础打字速度(ms/字符)，默认 80
  speedVariance: number;    // 速度随机变化范围，默认 40
  charChance: number;       // 单字输入概率
  wordChance: number;       // 单词输入概率
  pasteChance: number;      // 粘贴概率
  pauseEnabled: boolean;    // 是否启用停顿
  pauseProbability: number; // 停顿概率
  typoEnabled: boolean;     // 是否启用打错字
  cursorEnabled: boolean;   // 是否显示光标
  cursorBlinkRate: number;  // 光标闪烁频率(ms)
  fastMode: boolean;        // 快速模式（跳过动画）
  targetDuration: number;   // 目标总时长(秒)
}
```

### 3.6 ExportConfig（导出配置）

```typescript
interface ExportConfig {
  fps: number;
  width: number;
  height: number;
  styles?: {
    fontFamily?: string;
    fontSize?: number;
    avatarSize?: number;
    bubblePadding?: number;
    bubbleRadius?: number;
    bubbleLeftBg?: string;
    bubbleRightBg?: string;
    bubbleLeftColor?: string;
    bubbleRightColor?: string;
    background?: string;
    headerBg?: string;
    headerColor?: string;
    title?: string;
  };
}
```

---

## 四、布局系统

### 4.1 布局坐标系

```
Canvas (width × height)
┌─────────────────────────────────┐
│ 状态栏 (statusBarHeight)        │  ← 仅手机端（width < height）
├─────────────────────────────────┤
│ 标题栏 (headerHeight)           │  ← avatarSize + 8px
├─────────────────────────────────┤
│ contentPadding                  │
│ [头像] [发送者名]               │  ← senderHeight = avatarSize * 0.33
│         [气泡]                  │
│ gap                             │
│ [头像] [发送者名]               │
│         [气泡]                  │
│ contentPadding                  │
└─────────────────────────────────┘
```

### 4.2 LayoutConfig

```typescript
interface LayoutConfig {
  width: number;
  height: number;
  headerHeight: number;      // avatarSize + 8 * scale
  statusBarHeight: number;   // 手机端 24 * scale，桌面端 0
  avatarSize: number;        // 手机端 48 * scale，桌面端 40 * scale
  fontSize: number;          // 手机端 17 * scale，桌面端 14 * scale
  bubblePadding: number;     // 10 * scale
  bubbleRadius: number;      // 手机端 18 * scale，桌面端 10 * scale
  gap: number;               // 10 * scale
  contentPadding: number;    // 10 * scale
  maxBubbleWidthRatio: number; // 0.65（最大气泡宽度占总宽度的比例）
}
```

### 4.3 消息高度计算（calculateMessageHeight）

各消息类型的固定尺寸（基于 scale=1，实际乘以 scale）：

| 消息类型 | bubbleWidth | bubbleHeight | 说明 |
|----------|-------------|--------------|------|
| `system` / `timestamp` | 0 | 0 | rowHeight = 28px，居中显示 |
| `redpacket` | 180px | 102px | 固定尺寸 |
| `transfer` | 180px | 120px | 固定尺寸 |
| `image` | 180px | 180px | 正方形 |
| `file` | 220px | 64px | 白底带边框 |
| `voice` | 动态（60 + duration*10，最小120） | 36px（无文字）/ 动态（有文字） | 根据时长和转文字内容 |
| `text` | 动态（基于文字宽度） | 动态（基于行数） | 最大宽度 = width * 0.65 |

### 4.4 滚动逻辑

**满屏后才开始滚动**（所有渲染器统一逻辑）：

```typescript
// 用完整内容高度判断，避免打字中途气泡高度变化导致抖动
const { totalHeight: fullTotalHeight } = calculateAllLayouts(
  ctx, visibleMessages, layoutConfig, fullProgress, undefined, scale
);
const scrollOffset = Math.max(0, fullTotalHeight - visibleContentHeight);
```

- `fullProgress`：所有可见消息的完整内容（不是当前打字进度）
- `visibleContentHeight = height - headerHeight - statusBarHeight - contentPadding * 2`
- 当内容高度 ≤ 可视区域时，`scrollOffset = 0`，不滚动
- 超出后，`scrollOffset` 等于超出量，始终保持最新消息可见

---

## 五、打字动画系统

### 5.1 序列生成（SequenceGenerator）

`generateTypingSequence(message, config)` 将消息内容转换为打字事件序列：

1. 解析内容，分离 Emoji（`[微笑]` 格式）和普通文字
2. 对文字进行中文分词（`ChineseWordSplitter`）
3. 根据概率决定每个词的输入方式：
   - `charChance`：逐字输入（最真实）
   - `wordChance`：整词输入
   - 剩余概率：粘贴闪烁（`paste-flash`）
4. 根据 `typoEnabled` 随机插入打错字 + 退格事件
5. 根据 `pauseEnabled` 随机插入停顿事件

### 5.2 时间轴计算（calculateMessageTimings）

将消息序列映射到实际帧时间轴：

```typescript
// speedMultiplier = estimatedDuration / targetDuration
// 所有时长都除以 speedMultiplier，使总时长接近 targetDuration
const typingDuration = sequence.totalDuration / speedMultiplier;
const endTime = appearTime + typingDuration + messageInterval / speedMultiplier;
```

### 5.3 打字进度计算（getTypingProgressAtTime）

```typescript
// elapsedTime：消息出现后流逝的实际时间（ms）
// sequenceTime = elapsedTime * speedMultiplier（映射到序列时间轴）
const sequenceTime = elapsedTime * speedMultiplier;

// 遍历事件序列，累积到 sequenceTime 为止的文字
for (const event of sequence.events) {
  if (event.timestamp > sequenceTime) break;
  // 处理 char/emoji/backspace/paste-flash
}
```

### 5.4 Emoji 渲染

所有渲染器统一使用 `EMOJI_MAP`（基于 `wechatEmojis`）将 `[微笑]` 解析为 Unicode 字符：

```typescript
const EMOJI_MAP = new Map(wechatEmojis.map(e => [e.key, e]));
// 渲染时：emoji 使用 fontSize * 1.2 的 sans-serif 字体
// 文字使用 fontSize 的 "Microsoft YaHei", "PingFang SC" 字体
```

### 5.5 文字垂直居中（Canvas）

使用 `textBaseline = 'middle'`，每行中心点 = `y + (i + 0.5) * lineHeight`：

```typescript
for (let i = 0; i < lines.length; i++) {
  const lineCenterY = y + (i + 0.5) * lineHeight;
  // 绘制该行的所有字符/emoji
}
```

---

## 六、各渲染器详细设计

### 6.1 VideoExporter（simple 模式）

**文件**: `exporters/VideoExporter.ts`

**特点**: 有打字动画，基于时间轴的精确控制，高性能

**关键设计**:
- 时间步长 = `frameInterval`（不乘 speedMultiplier，保持帧率稳定）
- `elapsedTime = t - timing.appearTime`（实际流逝时间）
- `sequenceTime = elapsedTime * speedMultiplier`（映射到序列时间轴）
- 帧捕获使用同步 `canvas.toDataURL()`（比异步 `toBlob` 快 3-5 倍）
- 批量写入 FFmpeg（每 100 帧一批）

### 6.2 LoopRenderer（loop 模式）

**文件**: `renderers/LoopRenderer.ts`

**特点**: 逐字打字动画 + 光标闪烁，消息逐个显示

**关键设计**:
- 维护 `visibleMessages` 数组，逐帧推进
- `typingElapsed * speedMultiplier` 映射到序列时间轴
- 光标位置 = 最后一行文字宽度处，按 `cursorBlinkRate` 闪烁
- 与 ContentRenderer 代码结构相同，仅类名不同

### 6.3 ContentRenderer（content 模式）

**文件**: `renderers/ContentRenderer.ts`

与 LoopRenderer 逻辑完全相同，保留两个类以便未来差异化。

### 6.4 DOMRenderer（dom 模式）

**文件**: `renderers/DOMRenderer.ts`

**特点**: HTML 渲染，保真度最高，支持打字动画（文字消息）

**关键设计**:

```
每帧流程：
1. 推进消息出现（while currentMsgIndex < messages.length && t >= msgTimings[i].appearTime）
2. 计算打字进度（getVisibleContentAtTime）
3. 渲染完整内容到离屏 DOM（不滚动），测量 #dom-messages-wrapper 的 scrollHeight
4. 计算 scrollTop = max(0, actualContentH - visibleContentHeight)
5. 渲染实际帧（带 scrollTop 的 translateY）
6. html2canvas 截图 → canvas.toDataURL() → 写入 FFmpeg
```

**滚动实现**:
```html
<!-- 内容区域 -->
<div style="position:absolute;top:${totalHeaderHeight}px;...;overflow:hidden;">
  <div id="dom-messages-wrapper" style="transform:translateY(-${scrollTop}px);padding:...">
    <!-- 消息列表 -->
  </div>
</div>
```

用 `id="dom-messages-wrapper"` 精确定位，通过 `scrollHeight` 测量实际内容高度。

**打字动画**:
- 仅文字消息（`type === 'text'`）支持打字动画
- 其他消息类型（语音、图片、文件等）直接显示完整内容

---

## 七、消息渲染详细设计

### 7.1 文件消息（file）

**视觉规范**:
- 背景：`#FFFFFF` 白色 + `1px solid #E0E0E0` 边框 + 轻微阴影
- 文件图标：彩色圆角矩形（PDF 红、Word 蓝、Excel 绿、其他灰）
- 文件名：`#1A1A1A`，13px，超长截断
- 文件大小：`#888`，11px

**Canvas 绘制**（所有渲染器统一）:
```typescript
// 外框
ctx.fillStyle = '#FFFFFF'; ctx.fill();
ctx.strokeStyle = '#E0E0E0'; ctx.lineWidth = 1; ctx.stroke();
// 图标颜色
const iconColor = ext === 'PDF' ? '#E53935' : ext === 'DOCX' ? '#1565C0' : ...
```

### 7.2 引用消息（quote）

**视觉规范**（仿微信）:
- 位置：气泡内顶部，正文内容上方
- 左侧竖线：`3px solid #C9C9C9`
- 背景：`rgba(0,0,0,0.05)` 半透明灰
- 发送者：`#888`，加粗，11px
- 内容摘要：`#888`，11px，单行截断

**Canvas 绘制**:
```typescript
function drawQuote(ctx, x, y, w, quote, fontSize, scale): number {
  // 返回引用块高度（供文字内容偏移使用）
  const blockH = lineH * 2 + 8 * scale;
  // 绘制背景、竖线、发送者、摘要
  return blockH + 4 * scale;
}

// 调用方式
const quoteH = drawQuote(ctx, bubbleX + pad, bubbleY + pad, bubbleW - pad*2, msg.quote, fontSize, scale);
drawTextInBubble(ctx, text, bubbleX + pad, bubbleY + pad + quoteH, ...);
```

### 7.3 系统消息时间类型（time）

```typescript
case 'time':
  return {
    backgroundColor: 'rgba(0,0,0,0.06)',
    color: '#888',
    fontStyle: 'normal',
    icon: '',  // 无图标
  };
```

---

## 八、平台样式规范（已对齐微信官方）

### 8.1 微信手机端

| 参数 | 值 | 说明 |
|------|-----|------|
| 气泡绿色 | `#07C160` | 官方微信绿（之前错误使用 `#9fea58`） |
| 对方气泡 | `#FFFFFF` | 纯白 |
| 自己文字色 | `#FFFFFF` | 纯白（之前错误使用 `#192020`） |
| 对方文字色 | `#1A1A1A` | 近黑 |
| 背景色 | `#EDEDED` | 微信背景灰 |
| 字号 | 17px | 标准（之前 15px） |
| 头像尺寸 | 48px | 标准（之前 42px） |
| 气泡圆角 | 18px | 大圆角（之前 10px） |
| 气泡内边距 | 10px | 上下左右 |

### 8.2 微信电脑端

| 参数 | 值 |
|------|-----|
| 气泡绿色 | `#07C160` |
| 字号 | 14px |
| 头像尺寸 | 40px |
| 气泡圆角 | 10px |

---

## 九、性能优化

### 9.1 帧捕获优化

```typescript
// 同步 toDataURL（比异步 toBlob 快 3-5 倍）
const dataUrl = canvas.toDataURL('image/png');
const base64 = dataUrl.split(',')[1];
const binaryStr = atob(base64);
const uint8Array = new Uint8Array(binaryStr.length);
for (let i = 0; i < binaryStr.length; i++) {
  uint8Array[i] = binaryStr.charCodeAt(i);
}
```

### 9.2 批量写入 FFmpeg

```typescript
const BATCH_SIZE = 100;
if (frameBuffer.length >= BATCH_SIZE || t + timeStep > totalDuration) {
  for (let i = 0; i < framesToWrite; i++) {
    await ffmpeg.writeFile(`frame${String(startFrameIndex + i).padStart(5, '0')}.png`, frameBuffer[i]);
  }
  frameBuffer.length = 0;
}
```

### 9.3 DPR（设备像素比）

```typescript
const dpr = 2;
canvas.width = width * dpr;
canvas.height = height * dpr;
ctx.scale(dpr, dpr);  // 后续所有坐标使用逻辑像素
```

### 9.4 图像预加载

```typescript
// 导出前预加载所有用户头像和图片消息
for (const user of users) {
  if (user.avatar) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = user.avatar;
    imageCache.set(`avatar:${user.name}`, img);
    await new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
  }
}
```

---

## 十、已知限制

| 限制 | 说明 |
|------|------|
| DOM 模式速度慢 | 每帧需要 html2canvas 截图，比 Canvas 模式慢 5-10 倍 |
| Emoji 依赖系统字体 | Unicode emoji 需要系统字体支持，不同设备显示可能有差异 |
| 自定义头像需要 CORS | 跨域图片需要服务器配置 `Access-Control-Allow-Origin` |
| FFmpeg 首次加载慢 | 从 unpkg CDN 加载 WebAssembly，首次约 10-20 秒 |
| DOM 模式无法逐字动画非文字消息 | 语音、图片、文件等消息直接显示完整内容 |

---

## 十一、版本历史

| 版本 | 日期 | 修改内容 |
|------|------|---------|
| 1.0 | 2026-04-05 | 初始文档，四种渲染模式设计 |
| 2.0 | 2026-04-05 | 全面更新：修复所有 Bug、新增 file/quote/time 消息支持、对齐微信样式规范、DOM 模式打字动画、满屏滚动逻辑重写、帧捕获性能优化 |
