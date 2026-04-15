---
inclusion: always
---

# 项目结构

```
src/
├── types/index.ts          # 所有 TypeScript 类型定义（单一入口）
├── stores/chatStore.ts     # Zustand 全局状态（唯一 store）
├── App.tsx                 # 根组件，编辑/预览两个 tab
├── components/
│   ├── editor/             # 编辑器面板组件
│   │   ├── MessageList     # 消息列表与排序
│   │   ├── MessageInput    # 添加消息表单
│   │   ├── UserManager     # 用户管理
│   │   ├── ProjectList     # 项目列表
│   │   ├── TextImporter    # 批量文本导入
│   │   └── *Editor         # 各消息类型编辑器（RedPacket/Transfer/Voice/Image/System）
│   ├── preview/            # 预览组件
│   │   ├── Preview.tsx     # 预览容器 + 导出控制
│   │   └── ChatContainer   # 聊天界面渲染（CSS 实现）
│   ├── exporter/           # 导出面板
│   │   └── ExportPanel     # 导出设置 UI
│   ├── messages/           # 消息渲染组件（按平台分目录）
│   │   ├── index.tsx       # 组件注册中心（MessageComponents 对象）
│   │   ├── wechat/         # 微信消息组件（RedPacket/Transfer/Voice/Image/File/System/Timestamp）
│   │   ├── dingtalk/       # 钉钉消息组件
│   │   └── whatsapp/       # WhatsApp 消息组件
│   └── common/             # 通用组件（EmojiPicker/MessageContent/RedPacket）
├── core/
│   ├── canvasRenderer.ts   # Canvas 渲染器（视频帧 + 高清图片导出）
│   ├── exporter.ts         # Exporter 类（FFmpeg 视频合成、html2canvas 截图）
│   ├── messageLayout.ts    # 消息布局常量配置
│   ├── parser.ts           # 文本导入解析器
│   ├── scaleConfig.ts      # 缩放配置
│   └── typingAnimation/    # 打字动画系统
│       ├── types.ts
│       ├── config.ts
│       ├── generators/     # 序列生成器（逐字动画帧序列）
│       ├── renderers/      # 渲染器（Canvas/DOM/Loop）
│       ├── exporters/      # 视频导出器
│       └── components/     # 打字设置 Modal
├── themes/
│   ├── index.ts            # 主题导出入口
│   ├── wechat.ts           # 所有平台主题定义 + getPlatformConfig()
│   ├── platformFactory.ts  # createPlatform() 工厂函数
│   ├── templates.ts        # 移动端/桌面端基础模板
│   └── colorSchemes.ts     # 各平台配色方案
└── utils/
    ├── avatar.ts           # 头像生成工具
    ├── bubble.ts           # 气泡样式工具
    └── emoji.ts            # 微信表情数据
```

## 关键架构模式

### 状态管理
- 单一 Zustand store（`useChatStore`），所有状态集中管理
- 每次状态变更同步写入 `localStorage`
- 当前项目存储在 `state.project`，项目列表在 `state.projects`

### 平台主题系统
- `colorSchemes.ts` 定义配色 → `templates.ts` 定义布局基础值 → `platformFactory.ts` 的 `createPlatform()` 组合生成 `PlatformTheme`
- 平台行为配置通过 `getPlatformConfig(platformId)` 获取（气泡尾巴、状态栏、头像边框等）

### 消息组件注册
- `src/components/messages/index.tsx` 是组件注册中心
- 通过 `MessageComponents.wechat.redpacket` 等路径访问各平台组件
- 新增平台消息组件需在此注册

### 渲染双轨
- **预览**：React 组件 + CSS（`ChatContainer.tsx`）
- **导出**：`canvasRenderer.ts` 的 Canvas 原生绘制，确保与预览视觉一致

### 类型定义
- 所有类型集中在 `src/types/index.ts`，不在各模块内单独定义核心类型
- 消息组件专用类型在 `src/components/messages/types.ts`

## 命名约定
- 组件文件：PascalCase（`MessageItem.tsx`）
- 工具/核心文件：camelCase（`canvasRenderer.ts`）
- 平台 ID：kebab-case（`wechat-mobile`、`dingtalk`）
- Store action：动词开头（`addMessage`、`updateUser`、`setPlatform`）
