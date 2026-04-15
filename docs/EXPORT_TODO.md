# 视频导出功能 - 待办事项

**最后更新**: 2026-01-15

---

## 已完成 ✅

### 核心 Bug 修复
- [x] 消息同时出现（break → continue）
- [x] 滚动遮挡标题栏（满屏后才滚动）
- [x] Emoji 不显示（Unicode 解析）
- [x] 双重 speedMultiplier 错误
- [x] 帧捕获速度慢（toBlob → toDataURL）
- [x] DOM 模式无打字动画
- [x] DOM 模式自定义头像不生效
- [x] DOM 模式滚动选择器错误
- [x] DOM 模式文字在气泡底部
- [x] 文件消息在所有渲染器中显示为文字
- [x] 引用消息在所有渲染器中不显示
- [x] layoutUtils 缺少 file/timestamp case
- [x] **语音气泡高度计算错误**：使用 maxBubbleWidth 而非实际 bubbleWidth
- [x] **文件quote显示问题**：文件名和大小显示正常
- [x] **emoji quote显示问题**：DOM渲染器中emoji不显示

### 新功能
- [x] 引用/回复消息（类型定义 + 编辑器 + 预览 + 导出）
- [x] 文件消息编辑器（FileEditor.tsx）
- [x] 系统消息时间类型（time）
- [x] 微信样式规范对齐（#07C160、48px 头像、18px 圆角）
- [x] 文件消息视觉优化（白底+边框，区别于灰色背景）

---

## 待完成 ⏳

### 高优先级

- [ ] **视频消息**：视频缩略图 + 播放按钮样式
- [ ] **WhatsApp 平台完善**：样式存在但未完成
- [ ] **GIF 导出**：导出为动态图格式

### 中优先级

- [ ] **位置消息**：地图截图 + 位置名称
- [ ] **引用消息导入解析**：`parser.ts` 支持 `[引用 xxx]` 格式
- [ ] **Telegram 平台**：新建平台模板
- [ ] **iMessage 平台**：iOS 蓝色气泡

### 低优先级

- [ ] **背景音乐**：导出时添加 BGM
- [ ] **水印**：添加自定义水印
- [ ] **WebP 导出**：更高效的图片格式
- [ ] **模板系统**：项目导出/导入为模板文件

---

## 已知限制（设计决策，非 Bug）

| 限制 | 说明 |
|------|------|
| DOM 模式速度慢 | html2canvas 每帧截图，比 Canvas 慢 5-10 倍，属于设计取舍 |
| DOM 模式非文字消息无打字动画 | HTML 元素无法部分渲染，语音/图片/文件直接显示 |
| Emoji 依赖系统字体 | Unicode emoji 渲染效果因设备而异 |
| FFmpeg 首次加载慢 | 从 CDN 加载 WebAssembly，约 10-20 秒，后续复用 |
| 自定义头像需要 CORS | 跨域图片需服务器配置 `Access-Control-Allow-Origin` |

---

## 参考文档

- [详细设计文档](./EXPORT_DESIGN.md)
- [修复进度报告](./EXPORT_FIX_PROGRESS.md)
