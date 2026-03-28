# 视频导出方案设计文档

> 创建时间: 2026-03-28
> 当前状态: 方案 A 实现中

---

## 方案 A: 统一使用 Canvas 渲染（已完成）

### 原理
图片和视频都使用 Canvas 渲染器，视频会生成多帧静态图片，然后用 FFmpeg 合成视频。

### 实现思路
1. 复用现有的 `renderChatToCanvas` 函数
2. 添加 `maxMessages` 参数支持逐帧渲染
3. 逐条添加消息，生成每一帧
4. 用 FFmpeg.wasm 合成视频

### 优点
- 与图片导出 100% 一致
- 代码复用，维护成本低
- 性能稳定，无浏览器兼容问题
- 不需要弹出窗口

### 缺点
- 无法实现复杂动画（打字机效果、语音播放动画等）
- 只能是静态帧组合的视频
- 体验较平淡

### 已实现功能 ✅
- [x] 逐帧渲染消息（通过 `maxMessages` 参数）
- [x] 帧率控制
- [x] 消息间隔时间设置
- [x] FFmpeg.wasm 视频合成
- [x] 进度显示
- [x] 下载功能

---

## 方案 B: 增强 HTML + 动画

### 原理
视频使用真实 HTML 渲染，添加 CSS/JS 动画。

### 可实现的动画效果
1. **打字机效果**: 文字逐字/逐行显示
2. **气泡弹出**: 消息从底部滑入
3. **语音播放动画**: 波形动态播放
4. **头像动画**: 入场动画
5. **"正在输入..."效果**: 模拟对方输入中

### 技术实现
```typescript
// 打字机效果示例
function typeWriter(element: HTMLElement, text: string, speed: number) {
  let i = 0;
  function type() {
    if (i < text.length) {
      element.innerHTML += text.charAt(i);
      i++;
      setTimeout(type, speed);
    }
  }
  type();
}

// 逐帧截图
async function captureFrame(container: HTMLElement): Promise<Blob> {
  return await html2canvas(container, { scale: 1 });
}
```

### 优点
- 视觉效果丰富
- 接近真实聊天体验
- 可以配置动画参数

### 缺点
- 需要重写渲染逻辑，工作量大
- HTML 和 Canvas 渲染可能不一致
- 动画与帧率同步复杂

### 复杂度评估
- 开发时间: 2-4 周
- 代码量: 约 1000-2000 行

---

## 方案 C: Web Worker + 优化

### 原理
将渲染和 FFmpeg 合成放到 Web Worker 中，避免阻塞主线程。

### 架构设计
```
┌─────────────────┐     ┌─────────────────┐
│   Main Thread   │     │   Web Worker    │
│                 │     │                 │
│  - UI 交互      │────▶│  - Canvas 渲染  │
│  - 进度显示     │◀────│  - FFmpeg 合成  │
│  - 用户操作     │     │  - 帧管理       │
└─────────────────┘     └─────────────────┘
```

### 实现示例
```typescript
// main thread
const worker = new Worker('video-worker.ts');
worker.postMessage({ type: 'START', messages, settings });

worker.onmessage = (e) => {
  if (e.data.type === 'PROGRESS') {
    updateProgress(e.data.percent);
  }
  if (e.data.type === 'COMPLETE') {
    downloadVideo(e.data.blob);
  }
};

// worker thread
self.onmessage = async (e) => {
  if (e.data.type === 'START') {
    for (let i = 0; i < frames.length; i++) {
      const blob = await renderFrame(frames[i]);
      await ffmpeg.writeFile(`frame${i}.png`, blob);
      self.postMessage({ type: 'PROGRESS', percent: (i / frames.length) * 100 });
    }
    await ffmpeg.exec([...]);
    const video = await ffmpeg.readFile('output.mp4');
    self.postMessage({ type: 'COMPLETE', blob: video });
  }
};
```

### 优点
- 不阻塞主线程
- 用户可以继续操作界面
- 可以做实时进度反馈
- 支持更大的视频项目

### 缺点
- 代码复杂度大幅提升
- Worker 间通信开销
- 调试困难
- 需要处理跨 Worker 的 Canvas 问题

### 复杂度评估
- 开发时间: 1-2 周
- 代码量: 约 500-800 行
- 风险: 中等（Worker 调试困难）

---

## 方案 D.1: 自建服务器

### 服务器要求
- 操作系统: Linux (Ubuntu 20.04+) 或 Windows Server
- 内存: 最低 2GB，推荐 4GB+
- 硬盘: 根据存储需求
- 网络: 稳定的带宽

### 软件依赖
```bash
# 安装 FFmpeg
apt update
apt install ffmpeg

# 可选：Nginx 用于静态文件服务
apt install nginx
```

### API 设计
```
POST /api/render
Content-Type: multipart/form-data

{
  frames: [frame1.png, frame2.png, ...],
  fps: 30,
  width: 540,
  height: 960
}

Response:
{
  status: "processing",
  taskId: "xxx"
}

GET /api/status/{taskId}

Response:
{
  status: "completed",
  videoUrl: "/videos/xxx.mp4"
}
```

### 实现示例
```typescript
// 服务端 (Node.js + Express)
import express from 'express';
import multer from 'multer';
import { exec } from 'child_process';
import fs from 'fs/promises';

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/api/render', upload.array('frames'), async (req, res) => {
  const { fps } = req.body;
  const frames = req.files;
  
  // 生成 FFmpeg 命令
  const inputPattern = 'frame%05d.png';
  const outputFile = `output_${Date.now()}.mp4`;
  
  await execAsync(`ffmpeg -framerate ${fps} -i ${inputPattern} -c:v libx264 -pix_fmt yuv420p ${outputFile}`);
  
  res.json({ status: 'completed', videoUrl: `/videos/${outputFile}` });
});
```

### 优点
- 性能最好
- 浏览器负载低
- 可以处理超大视频
- 支持更多视频格式

### 缺点
- 需要部署和维护服务器
- 额外成本
- 网络延迟影响体验
- 数据隐私问题

### 成本估算
| 项目 | 费用 |
|------|------|
| 云服务器 (2核4G) | ¥50-100/月 |
| 带宽 | ¥20-50/月 |
| 存储 | ¥10-30/月 |
| **总计** | **¥80-180/月** |

---

## 方案 D.2: 云函数

### 推荐服务
| 服务 | 免费额度 | 超限价格 |
|------|---------|----------|
| Cloudflare Workers | 10万次/天 | $5/10万次 |
| AWS Lambda | 400,000 GB-秒 | $0.0000166667/GB-秒 |
| 阿里云函数计算 | 100万次/月 | ¥0.00011108/次 |

### 实现示例 (Cloudflare Workers)
```typescript
// workers/video合成.js
export default {
  async fetch(request) {
    const formData = await request.formData();
    const frames = formData.getAll('frames');
    const fps = parseInt(formData.get('fps')) || 30;
    
    // 将帧写入 /tmp (Cloudflare Workers 临时存储)
    for (let i = 0; i < frames.length; i++) {
      await Bun.write(`/tmp/frame${i.toString().padStart(5, '0')}.png`, frames[i]);
    }
    
    // 执行 FFmpeg 合成
    const result = await Bun.spawn([
      'ffmpeg', '-framerate', String(fps),
      '-i', '/tmp/frame%05d.png',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '/tmp/output.mp4'
    ]);
    
    const video = await Bun.file('/tmp/output.mp4').arrayBuffer();
    
    return new Response(video, {
      headers: { 'Content-Type': 'video/mp4' }
    });
  }
};
```

### 优点
- 无需维护服务器
- 自动扩缩容
- 按需付费
- 全球边缘部署

### 缺点
- 冷启动延迟
- 临时存储限制
- 需要适配云函数 API

---

## 方案 D.3: 专业视频 API

### 推荐服务

| 服务 | 特点 | 价格 |
|------|------|------|
| **Cloudflare Stream** | 专为视频设计，CDN 分发 | $5/500分钟/月 |
| **Mux** | 专业视频基础设施 | $0.004/分钟 |
| **DeepBrain AI** | 专注数字人视频 | 按分钟计费 |

### API 示例 (Mux)
```typescript
import Mux from '@mux/mux-node';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

// 上传帧并创建视频
const upload = await mux.video.uploads.create({
  new_asset_settings: {
    playback_policy: ['public'],
    mp4_support: 'capped-1080p',
  },
});

// 上传帧序列
for (const frame of frames) {
  await fetch(upload.url, {
    method: 'PUT',
    body: frame,
    headers: { 'Content-Type': 'image/png' }
  });
}

// 等待转码完成
const asset = await mux.video.assets.retrieve(upload.asset_id);
console.log('Video URL:', asset.playback_ids?.[0]?.url);
```

### 优点
- 功能完善
- CDN 全球分发
- 自动优化
- 技术支持好

### 缺点
- 成本较高
- 依赖第三方
- 数据需上传

---

## 方案对比总结

| 方案 | 开发成本 | 运行成本 | 性能 | 一致性 | 推荐度 |
|------|---------|---------|------|--------|--------|
| A: Canvas | 低 | 无 | 中 | 100% | ⭐⭐⭐⭐⭐ |
| B: HTML动画 | 高 | 无 | 中 | 需适配 | ⭐⭐⭐ |
| C: Web Worker | 中 | 无 | 中 | 好 | ⭐⭐⭐⭐ |
| D.1: 自建服务器 | 中 | ¥80-180/月 | 高 | 好 | ⭐⭐⭐ |
| D.2: 云函数 | 低 | ¥0-50/月 | 高 | 好 | ⭐⭐⭐⭐ |
| D.3: 专业API | 低 | ¥100+/月 | 高 | 好 | ⭐⭐ |

---

## 下一步计划

1. **完成方案 A** (已完成 ✅)
   - [x] 实现视频导出 UI
   - [x] 添加帧生成逻辑
   - [x] 集成 FFmpeg.wasm
   - [ ] 测试并发布

2. **方案 B** (后续迭代)
   - [ ] 评估需求
   - [ ] 设计动画系统
   - [ ] 实现动画渲染

3. **方案 C/D** (可选)
   - 根据用户反馈和扩展需求决定
