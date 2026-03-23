# Chat Maker - 聊天对话生成器

一款功能强大的聊天对话生成器，支持微信、QQ、钉钉等多平台风格，可导出高清图片和视频。

[![GitHub stars](https://img.shields.io/github/stars/coolhitbird/chat-maker)](https://github.com/coolhitbird/chat-maker/stargazers)
[![GitHub license](https://img.shields.io/github/license/coolhitbird/chat-maker)](https://github.com/coolhitbird/chat-maker/blob/master/LICENSE)

## ✨ 功能特性

- **多平台支持**：微信手机端、微信电脑端、QQ、钉钉
- **状态栏模拟**：电量、时间、信号、WiFi等系统图标
- **智能导入**：支持多种格式的对话文本导入
- **高清导出**：支持PNG图片和MP4视频导出
- **实时预览**：所见即所得的编辑体验
- **自适应布局**：消息气泡根据内容自动调整宽度
- **表情支持**：80+微信表情符号
- **用户管理**：支持多人对话，自定义头像

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:5173 即可使用

### 构建生产版本
```bash
npm run build
```

## 📱 支持的平台

| 平台 | 比例 | 特色功能 |
|------|------|----------|
| 微信手机端 | 9:16 | 状态栏、气泡尾巴 |
| 微信电脑端 | 16:9 | 简洁风格 |
| QQ | 9:16 | 方形头像、特殊背景 |
| 钉钉 | 16:9 | 大圆角气泡 |

## 📝 支持的导入格式

```
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
```

## 🛠️ 技术栈

- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite
- **状态管理**：Zustand
- **样式框架**：Tailwind CSS
- **视频合成**：FFmpeg.wasm
- **截图方案**：Canvas API (原生)

## 📁 项目结构

```
chat-maker/
├── src/
│   ├── components/
│   │   ├── preview/      # 预览组件
│   │   ├── editor/       # 编辑器组件
│   │   └── exporter/     # 导出组件
│   ├── core/
│   │   ├── canvasRenderer.ts  # Canvas渲染器
│   │   ├── exporter.ts       # 导出器
│   │   └── parser.ts         # 文本解析器
│   ├── themes/
│   │   └── wechat.ts         # 平台主题配置
│   └── stores/
│       └── chatStore.ts      # 状态管理
├── public/
│   └── emojis/               # 表情图片资源
└── docs/
    └── plans/               # 设计文档
```

## 🎯 开发计划

- [ ] 红包消息样式
- [ ] 转账消息样式
- [ ] 语音消息样式
- [ ] 图片消息支持
- [ ] 系统消息样式
- [ ] 多人聊天优化
- [ ] 更多表情包支持

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

- GitHub: [@coolhitbird](https://github.com/coolhitbird)

