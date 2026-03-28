# 视频导出设计文档

## 概述

视频导出功能允许用户将聊天记录导出为 MP4 视频格式，支持逐帧渲染和滚动效果。

## 导出方式

### 1. Canvas 视频导出 (recordVideoWithCanvas)

**位置**: `src/core/exporter.ts` - `recordVideoWithCanvas` 方法

**调用入口**: ExportPanel 的"Canvas 视频导出"按钮

**特点**:
- 独立的 Canvas 渲染流程
- 可控制每条消息的帧数
- 支持滚动动画

**实现方式**:
- 逐帧渲染递增的消息数量
- 使用滚动截图法处理内容溢出
- 每条消息占用 `fps` 帧（约 1 秒）

### 2. 基于预览的视频导出 (recordVideo)

**位置**: `src/core/exporter.ts` - `recordVideo` 方法

**调用入口**: Preview 页面的"导出视频"按钮

**特点**:
- 与图片导出使用相同的 Canvas 渲染器
- 确保视频与预览效果 100% 一致
- 支持图片预加载

**实现方式**:
- 使用 `renderChatToCanvas` 渲染器
- 预加载所有图片消息
- 每条消息显示 1 秒
- 最后一条消息额外停留 2 秒

## 核心组件

### CanvasRenderer

**位置**: `src/core/canvasRenderer.ts`

**主要函数**:
- `renderChatToCanvas(canvas, options)` - 将聊天内容渲染到 Canvas

**参数选项**:
```typescript
interface RenderOptions {
  width: number;           // Canvas 宽度
  height: number;          // Canvas 高度
  styles: ThemeStyles;      // 主题样式
  title: string;           // 标题
  messages: Message[];     // 消息数组
  users: UserProfile[];    // 用户信息
  emojiCache?: Map<string, HTMLImageElement>;  // 表情缓存
  imageCache?: Map<string, HTMLImageElement>;   // 图片缓存
}
```

### 消息类型支持

| 类型 | 渲染方式 | 说明 |
|------|----------|------|
| text | 气泡 + 文字 | 支持 emoji 和多行文本 |
| redpacket | 红包样式 | 渐变背景 + 图标 + 祝福语 |
| transfer | 转账样式 | 灰色背景 + 金额 + 状态 |
| voice | 语音样式 | 波形图 + 时长 + 转文字 |
| image | 图片样式 | 圆角矩形 + 实际图片 |
| system | 系统消息 | 居中灰色背景 |

## 技术细节

### 图片预加载

```typescript
// 预加载所有图片
const imageUrls = messages
  .filter(m => m.type === 'image' && m.image?.url)
  .map(m => m.image!.url!);

const imageCache = new Map<string, HTMLImageElement>();
await Promise.all(imageUrls.map(url => {
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(url, img);
      resolve();
    };
    img.src = url;
  });
}));
```

### 帧生成策略

```
messages[0]  → 渲染前 1 条消息 → 生成 framesPerMessage 帧
messages[1]  → 渲染前 2 条消息 → 生成 framesPerMessage 帧
messages[2]  → 渲染前 3 条消息 → 生成 framesPerMessage 帧
...
messages[n-1] → 渲染全部消息   → 生成 framesPerMessage + finalFramePause 帧
```

### 滚动处理

当内容高度超过可视区域时：
1. 渲染完整内容到 Canvas
2. 从底部向上截取目标高度
3. 将截取的区域绘制到目标 Canvas

```typescript
if (totalContentHeight > height) {
  const scrollY = totalContentHeight - height;
  targetCtx.drawImage(
    canvas,
    0, scrollY * dpr, width * dpr, height * dpr,
    0, 0, width, height
  );
}
```

## FFmpeg 合成

```bash
ffmpeg -framerate 30 -i frame%05d.png -c:v libx264 -pix_fmt yuv420p -preset fast output.mp4
```

**参数说明**:
- `-framerate 30`: 输入帧率 30fps
- `-i frame%05d.png`: 输入文件序列
- `-c:v libx264`: 使用 H.264 编码
- `-pix_fmt yuv420p`: 像素格式
- `-preset fast`: 编码速度

## 文件结构

```
chat-maker-v2/
├── src/
│   ├── core/
│   │   ├── exporter.ts          # 导出器（图片、视频、HTML）
│   │   └── canvasRenderer.ts    # Canvas 渲染器
│   └── components/
│       ├── exporter/
│       │   └── ExportPanel.tsx  # 导出面板 UI
│       └── preview/
│           └── Preview.tsx       # 预览页面
└── docs/
    ├── video-export-design.md   # 本文档
    └── video-export-progress.md # 实现进度
```

## 待优化项

- [ ] 添加滚动动画效果
- [ ] 支持打字动画
- [ ] 优化长对话的视频大小
- [ ] 添加水印功能
