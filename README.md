# Chat Maker - 聊天对话生成器

一款高质量聊天对话生成器，支持微信、QQ、钉钉等多平台风格，可导出高清图片和 MP4 视频（含打字动画）。

[![GitHub stars](https://img.shields.io/github/stars/coolhitbird/chat-maker)](https://github.com/coolhitbird/chat-maker/stargazers)
[![GitHub license](https://img.shields.io/github/license/coolhitbird/chat-maker)](https://github.com/coolhitbird/chat-maker/blob/master/LICENSE)
[![Version](https://img.shields.io/badge/version-v2.2.0-blue)](https://github.com/coolhitbird/chat-maker/releases)

---

## ✨ 功能特性

### 消息类型（全部支持预览 + 导出）

| 类型 | 说明 |
|------|------|
| 💬 文字消息 | 支持微信 Emoji（80+ 表情代码如 `[微笑]`）、引用/回复 |
| 🧧 红包消息 | 橙红渐变样式，支持已领取/未领取状态 |
| 💰 转账消息 | 绿色图标，支持已收款/待收款状态 |
| 🎙️ 语音消息 | 波形动画，支持语音转文字内容 |
| 📷 图片消息 | 支持 URL 或本地上传，带说明文字 |
| 📄 文件消息 | 白底带边框，彩色文件类型图标（PDF/Word/Excel 等） |
| ℹ️ 系统消息 | 撤回、拍一拍、添加好友、邀请进群、时间戳等 |
| ↩️ 引用/回复 | 气泡内顶部显示被引用消息（左侧灰色竖线 + 发送者 + 摘要） |

### 平台支持

| 平台 | 分辨率 | 比例 | 特色 |
|------|--------|------|------|
| 微信手机端 | 540×960 | 9:16 | 状态栏（时间/信号/电量）、大圆角气泡（18px）、绿色气泡（#07C160） |
| 微信电脑端 | 1280×720 | 16:9 | 窗口样式、简洁布局 |
| QQ | 540×960 | 9:16 | 方形头像、点阵背景 |
| 钉钉 | 1280×720 | 16:9 | 超大圆角气泡（20px） |

### 导出格式

| 格式 | 引擎 | 说明 |
|------|------|------|
| PNG 图片 | Canvas API | 高清，支持深色模式 |
| MP4 视频（普通） | Canvas + FFmpeg.wasm | 消息逐条出现，满屏后自动滚动 |
| MP4 视频（打字动画 - 简洁） | Canvas + FFmpeg.wasm | 逐字打字效果，高性能 |
| MP4 视频（打字动画 - 循环） | Canvas + FFmpeg.wasm | 逐字打字 + 光标闪烁 |
| MP4 视频（打字动画 - 内容） | Canvas + FFmpeg.wasm | 逐字打字，内容聚焦 |
| MP4 视频（打字动画 - DOM） | DOM + html2canvas + FFmpeg | HTML 保真度最高，支持打字动画 |

### 编辑功能

- **多项目管理**：本地 localStorage 持久化，支持新建/复制/删除/重命名
- **自动保存**：每 30 秒自动保存，Ctrl+S 手动保存
- **用户管理**：自定义头像（上传/URL）、排序、角色分配
- **批量导入**：支持 6 种格式（冒号分隔、方括号、箭头、AI对话、双人对白、带时间戳）
- **引用/回复**：消息列表点击 ↩ 按钮引用，发送时自动附带引用块
- **深色/浅色主题**：UI 界面和导出内容均支持
- **群聊/私聊**：支持群名称、成员人数、在线人数设置

---

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（访问 http://localhost:5173）
npm run dev

# 构建生产版本
npm run build
```

> **注意**：视频导出依赖 SharedArrayBuffer，开发服务器已配置 COOP/COEP 响应头，生产部署需同样配置。

---

## 📝 支持的导入格式

```
# 格式1：冒号分隔
用户A: 你好
用户B: 很高兴认识你

# 格式2：方括号
[用户A] 你好

# 格式3：箭头分隔
用户A -> 你好

# 格式4：AI对话格式
Human: 你好
AI: 你好呀

# 格式5：简单双人对白
- 你好
- 你好呀

# 格式6：带时间戳
10:30 用户A: 你好
```

### 特殊消息导入格式

```
[红包]                          → 普通红包
[红包 已领]                     → 已领取红包
[转账 100元 已收]               → 已收款转账
[语音 10秒]今天天气不错          → 10秒语音 + 转文字
[图片 说明文字]                  → 图片消息
[文件 报告.pdf 2.5MB]           → 文件消息
[撤回]                          → 撤回消息
[拍一拍 小明 拍了拍 小红]         → 拍一拍
[时间 昨天 10:30]               → 时间戳
[邀请 小明 邀请 小红 加入群聊]    → 邀请进群
```

---

## 🛠️ 技术栈

| 依赖 | 版本 | 用途 |
|------|------|------|
| React | ^18.x | UI 框架 |
| TypeScript | ^5.x | 类型系统（严格模式） |
| Vite | ^5.x | 构建工具 |
| Zustand | ^4.x | 状态管理 |
| Tailwind CSS | ^3.x | 样式框架 |
| @ffmpeg/ffmpeg | ^0.12.x | 浏览器端视频合成（WebAssembly） |
| html2canvas | ^1.x | DOM 转图片（DOM 模式导出） |
| nanoid | ^5.x | ID 生成 |

---

## 📁 项目结构

```
src/
├── types/index.ts              # 所有类型定义（Message、QuoteData、FileData 等）
├── stores/chatStore.ts         # Zustand 全局状态
├── App.tsx                     # 根组件（引用状态管理）
├── components/
│   ├── editor/                 # 编辑器组件
│   │   ├── MessageInput.tsx    # 消息输入（含引用提示条）
│   │   ├── MessageItem.tsx     # 消息列表项（含引用按钮）
│   │   ├── MessageList.tsx     # 消息列表（传递 onQuote 回调）
│   │   ├── FileEditor.tsx      # 文件消息编辑器（新增）
│   │   ├── SystemEditor.tsx    # 系统消息编辑器（含时间类型）
│   │   ├── VoiceEditor.tsx     # 语音消息编辑器
│   │   └── ...                 # 其他编辑器
│   ├── preview/
│   │   ├── Preview.tsx         # 预览 + 导出控制
│   │   └── ChatContainer.tsx   # 聊天界面渲染（含引用块渲染）
│   └── messages/wechat/        # 微信消息渲染组件
│       ├── File.tsx            # 文件消息（白底+边框）
│       ├── Voice.tsx           # 语音消息
│       ├── System.tsx          # 系统消息（含 time 类型）
│       └── ...
├── core/
│   ├── canvasRenderer.ts       # 图片/普通视频 Canvas 渲染器
│   ├── exporter.ts             # 导出器（FFmpeg 封装）
│   ├── parser.ts               # 文本导入解析器
│   └── typingAnimation/        # 打字动画视频导出系统
│       ├── types.ts            # 类型定义
│       ├── generators/         # 打字序列生成器
│       ├── renderers/          # Canvas/DOM 渲染器
│       │   ├── layoutUtils.ts  # 布局计算（含 file/timestamp case）
│       │   ├── LoopRenderer.ts
│       │   ├── ContentRenderer.ts
│       │   └── DOMRenderer.ts  # DOM 模式（含打字动画、自定义头像、满屏滚动）
│       └── exporters/
│           └── VideoExporter.ts # simple 模式
└── themes/
    ├── colorSchemes.ts         # 平台配色（微信绿 #07C160）
    └── templates.ts            # 布局模板（手机 48px 头像、18px 圆角）
```

---

## 🎨 微信样式规范（已对齐）

| 参数 | 手机端 | 电脑端 |
|------|--------|--------|
| 气泡绿色 | `#07C160` | `#07C160` |
| 对方气泡 | `#FFFFFF` | `#FFFFFF` |
| 字号 | 17px | 14px |
| 头像尺寸 | 48px | 40px |
| 气泡圆角 | 18px | 10px |
| 气泡内边距 | 10px | 10px |
| 背景色 | `#EDEDED` | `#F5F5F5` |

---

## 📋 更新日志

### v2.2.0 (2026-04-10)
**视频导出功能修复**
- 简洁模式：修复滚动遮挡标题栏、消息逐条显示
- 循环/内容模式：修复 Emoji 显示问题
- DOM模式：优化滚动和文字位置
- 修复 layoutUtils 中 totalHeight 计算错误

### v2.1.0 (2026-03-29)
**功能完善**
- 支持文件消息类型（PDF/Word/Excel等）
- 支持语音消息转文字内容
- 优化深色模式支持

### v2.0.0 (2026-03-28)
**重大更新**
- 全新设计的编辑器界面
- 支持多项目管理
- 批量导入功能
- 四种视频导出模式

---

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

- GitHub: [@coolhitbird](https://github.com/coolhitbird)
