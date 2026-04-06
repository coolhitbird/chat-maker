# 视频导出功能修复与优化进度

**项目**: chat-maker-v2  
**最后更新**: 2026-04-05  
**状态**: ✅ 已完成

---

## 一、修复总览

本次修复覆盖了视频/图片导出功能的全部渲染模式，以及新功能的完整实现。

---

## 二、Bug 修复记录

### 2.1 VideoExporter（simple 模式）

| 问题 | 状态 | 修复方案 |
|------|------|---------|
| 消息同时出现 | ✅ | `break` → `continue`，确保逐条显示 |
| 滚动遮挡标题栏 | ✅ | 满屏后才滚动：`scrollOffset = max(0, fullTotalHeight - visibleContentHeight)` |
| Emoji 不显示 | ✅ | `EMOJI_MAP` 解析 `[微笑]` → Unicode，`sans-serif` 字体渲染 |
| 双重 speedMultiplier 错误 | ✅ | 时间轴用实际 ms 推进，`sequenceTime = elapsedTime * speedMultiplier` |
| 帧捕获速度慢 | ✅ | `toBlob`（异步）→ `toDataURL`（同步），速度提升 3-5 倍 |
| 文件消息显示为文字 | ✅ | `renderFrame` 加 `file` 分支，调用 `drawFile()` |
| 引用消息不显示 | ✅ | 加 `drawQuote()` 函数，文字消息绘制前先渲染引用块 |
| 文字偏上 | ✅ | `textBaseline = 'middle'`，每行中心点 = `y + (i + 0.5) * lineHeight` |

### 2.2 LoopRenderer / ContentRenderer（loop/content 模式）

| 问题 | 状态 | 修复方案 |
|------|------|---------|
| 滚动跳跃（不平滑） | ✅ | 改为满屏后才滚动，用完整内容高度计算 |
| 自定义头像不生效 | ✅ | 加 `userAvatarMap`，`drawAvatar` 支持图片渲染 |
| 文件消息显示为文字 | ✅ | `renderLayouts` 加 `file` 分支 |
| 引用消息不显示 | ✅ | 加 `drawQuote()`，文字消息绘制前调用 |
| 文字偏上 | ✅ | 同 VideoExporter |
| 未使用的 import | ✅ | 移除 `calculateScrollOffset` import |

### 2.3 DOMRenderer（dom 模式）

| 问题 | 状态 | 修复方案 |
|------|------|---------|
| 无打字动画 | ✅ | 加 `generateTypingSequence`，每帧计算 `getVisibleContentAtTime` |
| 自定义头像不生效 | ✅ | `users` 参数不再被忽略，`createAvatarHtml` 支持 `<img>` 标签 |
| 滚动用时间进度（不正确） | ✅ | 改为测量 `#dom-messages-wrapper` 的 `scrollHeight`，满屏后才滚动 |
| 滚动选择器错误 | ✅ | `div > div:last-child > div` → `#dom-messages-wrapper`（精确 id 定位） |
| 文字在气泡底部 | ✅ | `display:inline-block` + `vertical-align:top`，`line-height:1.4` |
| 文件消息不显示 | ✅ | 加 `createFileHtml()`，`createMessageHtml` 加 `file` 分支 |
| 引用消息不显示 | ✅ | 加 `createQuoteHtml()`，文字气泡内容前插入引用块 HTML |
| 标题显示 "Chat" | ✅ | 改为 `escapeHtml(styles.title || 'Chat')` |

### 2.4 canvasRenderer.ts（图片导出 + 普通视频）

| 问题 | 状态 | 修复方案 |
|------|------|---------|
| 文件消息气泡高度计算错误 | ✅ | 加 `file` 分支：`bubbleHeight = 64 * scale` |
| 文件消息气泡宽度计算错误 | ✅ | 加 `file` 分支：`actualMaxLineWidth = 220 * scale` |
| 文件消息绘制为文字 | ✅ | 加完整的文件消息绘制逻辑（白底+边框+彩色图标+文件名+大小） |
| 引用消息不显示 | ✅ | 文字消息绘制前先渲染引用块，文字 Y 坐标加 `quoteOffsetY` |

### 2.5 layoutUtils.ts（布局计算）

| 问题 | 状态 | 修复方案 |
|------|------|---------|
| file 类型缺少 case | ✅ | 加 `case 'file'`：220×64px |
| timestamp 类型缺少 case | ✅ | 加 `case 'timestamp'`：rowHeight = 28px |

---

## 三、新功能实现记录

### 3.1 引用/回复消息

**类型定义**（`src/types/index.ts`）:
```typescript
interface QuoteData {
  messageId: string;
  sender: string;
  content: string;  // 截断到 30 字符
  type: MessageType;
}
// Message 接口加 quote?: QuoteData
```

**编辑器交互**:
- `MessageItem.tsx`：加引用按钮（↩），非系统消息可引用
- `MessageList.tsx`：接收 `onQuote` prop，传递给 MessageItem
- `MessageInput.tsx`：接收 `quoteMessage` prop，发送时附带 `quote` 数据，顶部显示引用提示条
- `App.tsx`：`quoteMessage` state 连接 MessageList 和 MessageInput

**预览渲染**（`ChatContainer.tsx`）:
- `renderQuote(msg)` 函数：左侧 3px 灰色竖线 + 发送者名 + 内容摘要
- 在气泡内容前插入

**导出渲染**（所有 Canvas 渲染器）:
- `drawQuote()` 函数：返回引用块高度，供文字内容偏移
- DOMRenderer：`createQuoteHtml()` 生成 HTML 引用块

### 3.2 文件消息编辑器

**新文件**：`src/components/editor/FileEditor.tsx`

功能：
- 选择文件类型（PDF/DOCX/XLSX/PPTX/ZIP/MP4/MP3/TXT）
- 输入文件名和文件大小
- 实时预览效果
- 已集成到 MessageInput（"文件"按钮）

### 3.3 系统消息时间类型

**SystemEditor.tsx** 新增 `time` 类型：
- 图标：无
- 样式：`rgba(0,0,0,0.06)` 背景，`#888` 文字
- 默认文本：`昨天 10:30`

**System.tsx** 新增 `time` case，`types/index.ts` 的 `SystemData.type` 联合类型加入 `'time'`。

### 3.4 微信样式规范对齐

**colorSchemes.ts** 修改：
- `wechatGreen.bubbleRightBg`: `#9fea58` → `#07C160`
- `wechatGreen.bubbleRightColor`: `#192020` → `#FFFFFF`
- `wechatGreen.background`: `#e8e8e8` → `#EDEDED`
- `wechatDesktopGreen.bubbleRightBg`: `#95ec69` → `#07C160`

**templates.ts** 修改（手机端）：
- `fontSize`: 15 → 17
- `bubbleRadius`: 10 → 18
- `avatarSize`: 42 → 48
- `bubblePadding`: 8 → 10

### 3.5 文件消息视觉优化

**File.tsx** 修改：
- 背景：`#f5f5f5` → `#FFFFFF` + `1px solid #E0E0E0` 边框 + 阴影
- 图标背景：`#e0e0e0` → `#EEF2FF`（浅蓝）
- 图标颜色：`#666` → `#4F46E5`（深蓝）

所有 Canvas 渲染器的 `drawFile()` 同步更新为白底+边框。

---

## 四、文件变更清单

| 文件 | 变更类型 | 主要内容 |
|------|----------|---------|
| `src/types/index.ts` | 修改 | 新增 `QuoteData`，`Message` 加 `quote?`，`SystemData.type` 加 `'time'` |
| `src/themes/colorSchemes.ts` | 修改 | 微信气泡绿改为 `#07C160`，文字色改为白色 |
| `src/themes/templates.ts` | 修改 | 手机端字号/圆角/头像/内边距对齐微信规范 |
| `src/components/editor/FileEditor.tsx` | 新增 | 文件消息编辑器 |
| `src/components/editor/MessageInput.tsx` | 修改 | 加文件按钮、引用提示条、`quoteMessage` prop |
| `src/components/editor/MessageItem.tsx` | 修改 | 加引用按钮（↩） |
| `src/components/editor/MessageList.tsx` | 修改 | 加 `onQuote` prop |
| `src/components/editor/SystemEditor.tsx` | 修改 | 加 `time` 类型 |
| `src/components/messages/wechat/File.tsx` | 修改 | 白底+边框+蓝色图标 |
| `src/components/messages/wechat/System.tsx` | 修改 | 加 `time` case，图标改为条件渲染 |
| `src/components/messages/wechat/Voice.tsx` | 修改 | 气泡宽度计算优化，转文字改为 block 布局 |
| `src/components/preview/ChatContainer.tsx` | 修改 | 加 `renderQuote()`，气泡内插入引用块 |
| `src/App.tsx` | 修改 | 加 `quoteMessage` state，连接 MessageList 和 MessageInput |
| `src/core/canvasRenderer.ts` | 修改 | 加 file 高度/宽度/绘制，加引用块绘制 |
| `src/core/typingAnimation/renderers/layoutUtils.ts` | 修改 | 加 `file`/`timestamp` case |
| `src/core/typingAnimation/exporters/VideoExporter.ts` | 修改 | 修复时间轴、加 `drawFile`/`drawQuote`、帧捕获优化 |
| `src/core/typingAnimation/renderers/LoopRenderer.ts` | 修改 | 加 `drawFile`/`drawQuote`、满屏滚动、自定义头像 |
| `src/core/typingAnimation/renderers/ContentRenderer.ts` | 修改 | 同 LoopRenderer |
| `src/core/typingAnimation/renderers/DOMRenderer.ts` | 重写 | 打字动画、自定义头像、满屏滚动、file/quote 支持 |
