# chat-maker 设计文档

**创建时间：** 2026-03-21  
**项目目标：** 开发一个聊天视频生成器，模拟聊天对话输出图片和视频

---

## 一、需求概述

### 1.1 核心功能

| 功能 | 描述 |
|------|------|
| 聊天模拟 | 支持多角色对话编辑 |
| 动态效果 | 打字机效果、消息弹出、满屏自动滚动 |
| 视频导出 | MP4 格式，支持多种尺寸 |
| 图片导出 | 静态截图 |
| 多平台 UI | 微信/QQ/钉钉等风格，可扩展 |
| 批量导入 | 支持粘贴大段文字，智能解析 |

### 1.2 技术方案

| 组件 | 技术 |
|------|------|
| 渲染 | React + DOM |
| 截图 | html2canvas |
| 视频合成 | FFmpeg.wasm |
| 状态管理 | Zustand |
| 样式 | Tailwind CSS |
| 构建 | Vite |

---

## 二、数据结构

### 2.1 核心类型定义

```typescript
// 消息类型
interface Message {
  id: string;
  role: 'user' | 'assistant';    // 发送者角色
  sender: string;                 // 发送者名称
  avatar: string;                 // 头像 URL
  content: string;                 // 内容（支持表情）
  type: 'text' | 'image' | 'voice';
  timestamp: number;
}

// 用户配置
interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  role: 'user' | 'assistant';
}

// 平台主题
interface PlatformTheme {
  id: string;
  name: string;
  ratio: '9:16' | '16:9' | '1:1';
  emojiSet: 'native' | 'wechat' | 'qq';
  styles: ThemeStyles;
}

// 对话项目
interface ChatProject {
  id: string;
  name: string;
  platform: PlatformTheme;
  users: UserProfile[];
  messages: Message[];
  settings: ExportSettings;
}

// 导出设置
interface ExportSettings {
  width: number;
  height: number;
  fps: number;
  videoBitrate: number;
  typingSpeed: number;           // 打字速度(ms/字)
  messageInterval: number;        // 消息间隔(ms)
  scrollEnabled: boolean;        // 满屏滚动
}
```

---

## 三、平台主题配置

### 3.1 微信主题示例

```typescript
// themes/wechat.ts
export const wechatTheme: PlatformTheme = {
  id: 'wechat',
  name: '微信',
  ratio: '9:16',
  emojiSet: 'wechat',
  styles: {
    background: '#f5f5f5',
    bubbleLeftBg: '#ffffff',
    bubbleRightBg: '#95ec69',
    bubbleLeftColor: '#000000',
    bubbleRightColor: '#000000',
    headerBg: '#1e1e1e',
    headerColor: '#ffffff',
    fontFamily: 'sans-serif',
    fontSize: 14,
    bubbleRadius: 8,
    bubblePadding: 10,
    avatarSize: 40,
    messageGap: 8,
    timeGap: 300,
  }
};
```

### 3.2 视频尺寸映射

| 平台 | 比例 | 尺寸 |
|------|------|------|
| 微信 | 9:16 | 540 x 960 (可配置) |
| QQ | 9:16 | 540 x 960 (可配置) |
| 钉钉 | 16:9 | 1280 x 720 (可配置) |
| 自定义 | 1:1 | 720 x 720 |

---

## 四、文字解析规则

### 4.1 支持的输入格式

```text
# 格式1：冒号分隔
用户A: 你好
用户B: 很高兴认识你

# 格式2：方括号
[用户A] 你好
[用户B] 很高兴认识你

# 格式3：箭头分隔
用户A -> 你好
用户B -> 很高兴认识你

# 格式4：AI对话格式
Human: 你好
AI: 你好呀

# 格式5：带时间戳
10:30 用户A: 你好
10:31 用户B: 好的

# 格式6：简单双人对白
- 你好
- 你好呀
```

### 4.2 解析规则

```typescript
interface ParseRule {
  id: string;
  pattern: RegExp;
  extract: (match: RegExpMatchArray, lineIndex: number) => ParsedMessage;
  priority: number;
}

// 解析流程
function parseConversation(text: string, users: UserProfile[]): Message[] {
  // 1. 检测使用的格式（自动识别优先级最高的匹配规则）
  // 2. 按行分割
  // 3. 识别发送者名称
  // 4. 提取内容
  // 5. 自动分配角色（奇数行 user，偶数行 assistant；或根据名称匹配）
  // 6. 返回 Message[]
}
```

### 4.3 解析选项

```typescript
interface ParseOptions {
  mergeConsecutive: boolean;     // 连续同一人发言合并
  autoAssignRoles: boolean;      // 自动分配 user/assistant
  matchByName: boolean;          // 按名称匹配已有用户
  preserveEmoji: boolean;        // 保留表情符号
}
```

---

## 五、头像系统

### 5.1 头像来源

| 来源 | 说明 |
|------|------|
| 内置头像 | 内置 20+ 套风格头像 |
| 自动生成 | DiceBear API 生成 |
| 自定义上传 | 用户上传本地图片 |

### 5.2 内置头像风格

```typescript
const builtInAvatars = {
  // 卡通风格
  cartoon: [
    '/avatars/cartoon/man1.png',
    '/avatars/cartoon/woman1.png',
    // ...
  ],
  // 真人风格
  realistic: [
    '/avatars/realistic/face1.png',
    // ...
  ],
  // 简约风格
  minimal: [
    '/avatars/minimal/circle1.png',
    // ...
  ],
};

// 自动生成（DiceBear）
function generateAvatar(seed: string, style: string = 'avataaars'): string {
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
}
```

---

## 六、表情支持

### 6.1 表情类型

| 类型 | 实现方式 |
|------|----------|
| Unicode Emoji | 原生支持 😀 😂 ❤️ |
| 颜文字 | 原生支持 (╯°□°）╯︵ ┻━┻ |
| 微信表情 | 图片资源 + shortcode |
| QQ 表情 | 图片资源 |

### 6.2 微信表情配置

```typescript
interface WechatEmoji {
  key: string;        // 短代码，如 "[微笑]"
  name: string;       // 名称
  url: string;        // 图片 URL
}

// 表情映射
const wechatEmojis: WechatEmoji[] = [
  { key: '[微笑]', name: 'smile', url: '/emojis/wechat/smile.png' },
  { key: '[撇嘴]', name: 'pout', url: '/emojis/wechat/pout.png' },
  // ... 100+ 表情
];

// 渲染时替换
function parseEmoji(content: string, emojiSet: string): string {
  // 将 [微笑] 替换为 <img src="..."> 
}
```

### 6.3 常用表情清单（优先实现）

```
[微笑] [撇嘴] [色] [发呆] [得意] [流泪] [害羞] [闭嘴]
[睡] [大哭] [尴尬] [发怒] [调皮] [呲牙] [惊讶] [难过]
[酷] [冷汗] [抓狂] [吐] [偷笑] [愉快] [白眼] [傲慢]
[饥饿] [困] [惊恐] [流汗] [憨笑] [大兵] [奋斗] [咒骂]
[疑问] [嘘] [晕] [疯了] [衰] [骷髅] [敲打] [再见]
[擦汗] [抠鼻] [鼓掌] [糗大了] [坏笑] [左哼哼] [右哼哼]
[哈欠] [鄙视] [委屈] [快哭了] [阴险] [亲亲] [吓] [可怜]
```

---

## 七、动画引擎

### 7.1 动画类型

| 动画 | 触发时机 | 配置项 |
|------|----------|--------|
| 打字机 | 每条消息 | typingSpeed (ms/字) |
| 消息弹入 | 每条消息 | messageInterval (ms) |
| 自动滚动 | 满屏时 | scrollThreshold (%) |
| 暂停等待 | 特定消息 | pauseDuration (ms) |

### 7.2 核心接口

```typescript
class Animator {
  constructor(container: HTMLElement, settings: ExportSettings);
  
  // 打字机效果
  async typeText(element: HTMLElement, text: string): Promise<void>;
  
  // 消息弹入
  async showMessage(msg: Message): Promise<void>;
  
  // 滚动到底部
  async scrollToBottom(): Promise<void>;
  
  // 等待一段时间
  wait(ms: number): Promise<void>;
  
  // 播放完整对话
  async play(messages: Message[]): Promise<void>;
  
  // 停止播放
  stop(): void;
}
```

### 7.3 播放流程

```
开始播放
    ↓
显示消息1
    ↓
打字机动画（content 逐字显示）
    ↓
消息弹入动画
    ↓
滚动到底部
    ↓
等待 messageInterval
    ↓
显示消息2
    ↓
... (循环)
    ↓
播放完成
```

---

## 八、导出模块

### 8.1 导出流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  渲染 DOM   │ ──► │ html2canvas │ ──► │   序列帧    │
│  动画播放   │     │   截图      │     │   Blob[]    │
└─────────────┘     └─────────────┘     └─────────────┘
                                                ↓
                   ┌─────────────┐     ┌─────────────┐
                   │   MP4 文件   │ ◄── │  FFmpeg     │
                   │   下载       │     │  合成视频   │
                   └─────────────┘     └─────────────┘
```

### 8.2 导出接口

```typescript
class Exporter {
  constructor(ffmpeg: FFmpeg);
  
  // 截图
  async captureImage(element: HTMLElement): Promise<Blob>;
  
  // 录制视频
  async recordVideo(
    container: HTMLElement,
    messages: Message[],
    settings: ExportSettings,
    onProgress: (percent: number) => void
  ): Promise<Blob>;
  
  // 导出文件
  download(blob: Blob, filename: string): void;
}
```

### 8.3 导出配置

```typescript
const defaultExportSettings: ExportSettings = {
  width: 540,
  height: 960,
  fps: 30,
  videoBitrate: 2000,
  typingSpeed: 50,           // 50ms/字
  messageInterval: 500,      // 500ms
  scrollEnabled: true,
};
```

---

## 九、项目结构

```
chat-maker/
├── public/
│   ├── index.html
│   ├── emojis/
│   │   └── wechat/          # 微信表情图片
│   └── avatars/             # 内置头像
│       ├── cartoon/
│       ├── realistic/
│       └── minimal/
├── src/
│   ├── components/
│   │   ├── platforms/        # 平台 UI 组件
│   │   │   ├── BaseChat.tsx          # 基础聊天组件
│   │   │   ├── WechatUI.tsx          # 微信风格
│   │   │   ├── QQUI.tsx              # QQ 风格
│   │   │   └── index.ts              # 导出
│   │   ├── editor/          # 编辑器
│   │   │   ├── MessageList.tsx       # 消息列表
│   │   │   ├── MessageItem.tsx        # 单条消息
│   │   │   ├── MessageInput.tsx       # 输入框
│   │   │   ├── TextImporter.tsx       # 批量导入
│   │   │   └── UserManager.tsx       # 用户管理
│   │   ├── preview/          # 预览区
│   │   │   └── Preview.tsx
│   │   ├── exporter/         # 导出控制
│   │   │   ├── ExportPanel.tsx
│   │   │   └── ExportProgress.tsx
│   │   └── common/           # 通用组件
│   │       ├── Avatar.tsx
│   │       ├── EmojiPicker.tsx
│   │       └── Button.tsx
│   ├── core/
│   │   ├── animator.ts       # 动画引擎
│   │   ├── exporter.ts       # 导出器
│   │   ├── parser.ts         # 文字解析
│   │   └── ffmpeg.ts         # FFmpeg 封装
│   ├── stores/
│   │   └── chatStore.ts      # Zustand 状态管理
│   ├── themes/
│   │   ├── wechat.ts
│   │   ├── qq.ts
│   │   └── index.ts
│   ├── types/
│   │   └── index.ts          # 类型定义
│   ├── utils/
│   │   ├── emoji.ts          # 表情解析
│   │   └── avatar.ts         # 头像工具
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 十、技术栈详情

| 依赖 | 版本 | 用途 |
|------|------|------|
| react | ^18.x | UI 框架 |
| react-dom | ^18.x | React DOM |
| typescript | ^5.x | 类型系统 |
| vite | ^5.x | 构建工具 |
| zustand | ^4.x | 状态管理 |
| tailwindcss | ^3.x | 样式 |
| @ffmpeg/ffmpeg | ^0.12.x | 视频合成 |
| @ffmpeg/util | ^0.12.x | FFmpeg 工具 |
| html2canvas | ^1.x | DOM 转图片 |
| nanoid | ^5.x | ID 生成 |

---

## 十一、开发计划

### Phase 1：基础框架
- [x] 项目初始化（Vite + React + TS）
- [x] 状态管理配置（Zustand）
- [x] 基础类型定义
- [x] Tailwind CSS 配置

### Phase 2：核心 UI
- [x] 基础聊天组件（BaseChat）
- [x] 消息列表渲染
- [x] 消息输入组件
- [x] 用户/头像管理

### Phase 3：平台主题
- [x] 微信主题配置
- [x] 微信 UI 实现
- [x] QQ 主题配置

### Phase 4：动画引擎
- [x] 打字机效果
- [x] 消息弹入动画
- [x] 自动滚动逻辑

### Phase 5：导出功能
- [x] FFmpeg.wasm 集成
- [x] 截图功能
- [x] 视频录制
- [x] 进度显示

### Phase 6：批量导入
- [x] 文字解析器
- [x] 多种格式支持
- [x] 导入预览

### Phase 7：表情支持
- [x] Emoji 渲染
- [x] 微信表情图片
- [x] 表情选择器

### Phase 8：优化完善
- [x] 性能优化
- [x] 错误处理
- [x] 部署配置

---

## 十二、版本历史

### v1.1.0 (2026-03-21)
**编辑和导入功能完善**
- ✅ 多行消息解析（支持换行内容合并）
- ✅ 自动生成用户头像
- ✅ 导入时自动添加新用户
- ✅ 用户排序功能（调整当事人位置）
- ✅ 第一位用户消息显示在右侧（当事人）
- ✅ 列表项过滤（`1.`、`4.` 不误识别为用户名）
- ✅ 微信表情支持（80+ 表情代码）
- ✅ 表情选择器组件
- ✅ 平台特定样式优化（微信/QQ/钉钉）
- ✅ 头像 Canvas 绘制（解决 html2canvas 兼容问题）

### v1.0.0 (2026-03-21)
**初始版本**
- ✅ 项目初始化（Vite + React + TypeScript）
- ✅ 状态管理（Zustand）
- ✅ 多平台主题切换（微信/QQ/钉钉）
- ✅ 消息列表 CRUD
- ✅ 批量导入（6种格式）
- ✅ 用户管理
- ✅ 打字机动画预览
- ✅ 图片导出
- ✅ 视频导出（FFmpeg.wasm）

---

**当前版本：** v1.1.0  
**最后更新：** 2026-03-21
