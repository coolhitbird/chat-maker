---
inclusion: always
---

# 技术栈

## 核心框架
- React 18 + TypeScript（严格模式）
- Vite 5 构建工具
- Tailwind CSS 样式框架
- Zustand 状态管理

## 主要依赖
- `@ffmpeg/ffmpeg` + `@ffmpeg/util`：浏览器端视频合成（WebAssembly）
- `html2canvas`：DOM 截图（图片导出备用方案）
- `nanoid`：ID 生成
- `dom-to-image`：已引入但主要用 html2canvas

## 路径别名
`@/` 映射到 `src/`，例如 `import { useChatStore } from '@/stores/chatStore'`

## TypeScript 配置
- 严格模式开启（`strict: true`）
- `noUnusedLocals` 和 `noUnusedParameters` 均为 true，不允许未使用的变量
- 目标：ES2020，模块解析：bundler

## 特殊配置
- 开发服务器需要 COOP/COEP 头（FFmpeg SharedArrayBuffer 要求）：
  ```
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  ```
- FFmpeg 依赖从 `optimizeDeps.exclude` 排除，避免 Vite 预构建

## 常用命令

```bash
# 启动开发服务器（访问 http://localhost:5173）
npm run dev

# 类型检查 + 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 注意事项
- 无测试框架配置，目前没有单元测试
- 无 ESLint/Prettier 配置文件（依赖 TypeScript 严格检查）
- 数据持久化完全依赖 `localStorage`，无后端
