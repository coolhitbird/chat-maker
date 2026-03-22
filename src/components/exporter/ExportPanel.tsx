import { useState, useMemo } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { Exporter, generateChatHtml } from '@/core/exporter';
import { getPlatformConfig } from '@/themes/wechat';
import ChatContainer from '@/components/preview/ChatContainer';

export default function ExportPanel() {
  const { project, isExporting, setIsExporting, setExportProgress, setExportingVideoVisibleCount } = useChatStore();
  const { messages, settings, platform, users } = project;
  const { styles } = platform;
  const [exportType, setExportType] = useState<'image' | 'video'>('image');
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');

  const config = getPlatformConfig(platform.id);
  const isMobile = config.deviceType === 'mobile';

  // 计算预览缩放尺寸
  const previewDimensions = useMemo(() => {
    const targetHeight = 400;
    const targetWidth = 500;
    
    if (isMobile) {
      const scale = targetHeight / settings.height;
      return {
        width: Math.round(settings.width * scale),
        height: targetHeight,
        scale,
      };
    } else {
      const scale = targetWidth / settings.width;
      return {
        width: targetWidth,
        height: Math.round(settings.height * scale),
        scale,
      };
    }
  }, [settings.width, settings.height, isMobile]);

  const handleExportImage = async () => {
    if (messages.length === 0) {
      setError('请先添加消息');
      return;
    }

    setIsExporting(true);
    setError('');
    setExportProgress(0);

    try {
      const exporter = new Exporter();
      setStatus('正在生成图片...');
      setExportProgress(30);

      const title = project.chatTitle || platform.name;

      setExportProgress(60);
      const blob = await exporter.captureImageFromCanvas(
        messages,
        platform.styles,
        settings.width,
        settings.height,
        title,
        users
      );

      setExportProgress(90);
      setStatus('正在下载...');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportProgress(100);
      setStatus('图片已下载！');
    } catch (err) {
      console.error('Export failed:', err);
      setError('导出失败: ' + (err as Error).message);
    } finally {
      setIsExporting(false);
      setTimeout(() => setStatus(''), 3000);
    }
  };

  const handleExportHtml = () => {
    if (messages.length === 0) {
      setError('请先添加消息');
      return;
    }

    const platformConfig = { name: platform.name, styles: platform.styles };
    const html = generateChatHtml(messages, platformConfig, settings.width, settings.height, project.chatTitle, users);

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>聊天预览</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
</head>
<body style="display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #e5e5e5;">
  ${html}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatus('HTML 已下载！');
    setTimeout(() => setStatus(''), 3000);
  };

  const handleExportVideo = async () => {
    if (messages.length === 0) {
      setError('请先添加消息');
      return;
    }
    
    setIsExporting(true);
    setError('');
    setExportProgress(0);

    try {
      const exporter = new Exporter();
      setStatus('正在加载 FFmpeg...');
      await exporter.init();

      const platformConfig = { name: platform.name, styles: platform.styles };
      let frameIndex = 0;
      const { fps, messageInterval } = settings;

      setStatus('正在录制视频帧...');

      for (let i = 0; i < messages.length; i++) {
        setExportingVideoVisibleCount(i + 1);
        setExportProgress(10 + Math.round(((i + 1) / messages.length) * 70));
        
        const visibleMessages = messages.slice(0, i + 1);
        const html = generateChatHtml(visibleMessages, platformConfig, settings.width, settings.height, project.chatTitle, users);
        
        await new Promise(resolve => setTimeout(resolve, messageInterval));

        const blob = await exporter.captureFrameFromHtml(html, settings.width, settings.height, styles.background);
        await exporter.captureAndSaveFrame(blob, frameIndex);
        frameIndex++;
      }

      const finalHtml = generateChatHtml(messages, platformConfig, settings.width, settings.height, project.chatTitle, users);
      for (let i = 0; i < fps; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000 / fps));
        const blob = await exporter.captureFrameFromHtml(finalHtml, settings.width, settings.height, styles.background);
        await exporter.captureAndSaveFrame(blob, frameIndex);
        frameIndex++;
      }

      setStatus('正在合成视频...');
      setExportProgress(85);
      
      const videoBlob = await exporter.compileVideo(frameIndex, fps);
      
      setStatus('正在下载...');
      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setExportProgress(100);
      setStatus('视频已下载！');
    } catch (err) {
      console.error('Export failed:', err);
      setError('导出失败: ' + (err as Error).message);
    } finally {
      setIsExporting(false);
      setTimeout(() => setStatus(''), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">导出设置</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">导出格式</label>
            <select
              value={exportType}
              onChange={e => setExportType(e.target.value as 'image' | 'video')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="image">图片 (PNG)</option>
              <option value="video">视频 (MP4)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">输出尺寸</label>
            <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
              {settings.width} × {settings.height} ({platform.ratio})
            </div>
          </div>
        </div>

        {exportType === 'video' && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">帧率 (FPS)</label>
              <input
                type="number"
                value={settings.fps}
                onChange={e => useChatStore.getState().updateSettings({ fps: Number(e.target.value) })}
                min="15"
                max="60"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">视频码率 (kbps)</label>
              <input
                type="number"
                value={settings.videoBitrate}
                onChange={e => useChatStore.getState().updateSettings({ videoBitrate: Number(e.target.value) })}
                min="500"
                max="5000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        )}

        <div className="text-sm text-gray-500 mb-4">
          消息数量: {messages.length} 条
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {status && !error && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-600 text-sm">
            {status}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleExportImage}
            disabled={isExporting || messages.length === 0}
            className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isExporting ? '导出中...' : '导出图片 (PNG)'}
          </button>
          <button
            onClick={handleExportVideo}
            disabled={isExporting || messages.length === 0}
            className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isExporting ? '导出中...' : '导出视频 (MP4)'}
          </button>
        </div>

        <div className="mt-3">
          <button
            onClick={handleExportHtml}
            disabled={messages.length === 0}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            导出 HTML (可用浏览器打印为 PDF/图片)
          </button>
        </div>

        {isExporting && (
          <div className="mt-4">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${useChatStore.getState().exportProgress}%` }}
              />
            </div>
            <div className="text-sm text-gray-500 mt-1 text-center">
              导出进度: {useChatStore.getState().exportProgress}%
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">导出预览 ({settings.width}×{settings.height})</h2>
        <div className="flex justify-center">
          <div 
            id="chat-export-container"
            className="rounded-lg overflow-hidden shadow"
            style={{ 
              width: previewDimensions.width, 
              height: previewDimensions.height,
            }}
          >
            <ChatContainer 
              messages={messages}
              scale={previewDimensions.scale}
            />
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">
          预览已缩放，实际导出为 {settings.width}×{settings.height} 像素
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">实际导出尺寸</h2>
        <div className="text-center text-2xl font-mono">
          {settings.width} × {settings.height}
        </div>
        <p className="text-sm text-gray-500 text-center mt-2">
          内容将按预览比例渲染，确保换行一致
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">使用说明</h2>
        <div className="text-sm text-gray-600 space-y-2">
          <p>1. 在「编辑」页面添加或导入对话内容</p>
          <p>2. 在「预览」页面查看动画效果</p>
          <p>3. 返回「导出」页面点击导出按钮</p>
          <p className="text-orange-500">注意：导出视频需要加载 FFmpeg，首次加载可能需要 10-20 秒</p>
        </div>
      </div>
    </div>
  );
}
