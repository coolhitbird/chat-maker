import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { getPlatformConfig } from '@/themes/wechat';
import { allThemes } from '@/themes';
import { Exporter, generateChatHtml } from '@/core/exporter';
import ChatContainer from './ChatContainer';

export interface ResolutionOption {
  label: string;
  width: number;
  height: number;
}

export const resolutionOptions: ResolutionOption[] = [
  { label: '540×960 (9:16 手机)', width: 540, height: 960 },
  { label: '720×1280 (9:16 高清)', width: 720, height: 1280 },
  { label: '1280×720 (16:9 电脑)', width: 1280, height: 720 },
  { label: '1920×1080 (16:9 全高清)', width: 1920, height: 1080 },
  { label: '1080×1080 (1:1 方形)', width: 1080, height: 1080 },
];

export default function Preview() {
  const { 
    project, 
    isPlaying, 
    setIsPlaying, 
    updateSettings, 
    setPreviewRef, 
    isExporting, 
    setIsExporting,
    setExportProgress,
    exportingVideoVisibleCount, 
    setExportingVideoVisibleCount, 
    setChatType, 
    updateGroupInfo,
    setPlatform 
  } = useChatStore();
  
  const { platform, messages, settings, chatType, groupInfo, users } = project;
  const isGroup = chatType === 'group';
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const [typingProgress, setTypingProgress] = useState<Record<string, number>>({});
  const animationRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);
  const [exportType, setExportType] = useState<'image' | 'video'>('image');
  const [exportStatus, setExportStatus] = useState<string>('');
  const [exportError, setExportError] = useState<string>('');

  const config = getPlatformConfig(platform.id);
  const isMobile = config.deviceType === 'mobile';

  useEffect(() => {
    if (previewContainerRef.current) {
      setPreviewRef(previewContainerRef.current);
    }
    return () => setPreviewRef(null);
  }, [setPreviewRef]);

  const playAnimation = useCallback(async () => {
    if (messages.length === 0) return;
    
    setIsPlaying(true);
    isPlayingRef.current = true;
    setVisibleCount(0);
    setTypingProgress({});

    for (let i = 0; i < messages.length; i++) {
      if (!isPlayingRef.current) break;
      
      const msg = messages[i];
      
      // 如果是系统消息，直接显示
      if (msg.type === 'system') {
        setVisibleCount(i + 1);
        await new Promise(resolve => setTimeout(resolve, settings.messageInterval));
      } else {
        // 普通消息：打字动画
        setVisibleCount(i + 1);
        const content = msg.content || '';
        const charDelay = settings.typingSpeed;
        
        // 打字动画：逐字显示
        for (let charIdx = 1; charIdx <= content.length; charIdx++) {
          if (!isPlayingRef.current) break;
          setTypingProgress(prev => ({ ...prev, [msg.id]: charIdx }));
          await new Promise(resolve => setTimeout(resolve, charDelay));
        }
        
        // 确保最终显示完整内容
        setTypingProgress(prev => ({ ...prev, [msg.id]: content.length }));
        
        // 等待消息间隔
        const typingTime = content.length * charDelay;
        const remainingTime = Math.max(0, settings.messageInterval - typingTime);
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
      }
    }

    isPlayingRef.current = false;
    setIsPlaying(false);
    setTypingProgress({});
  }, [messages, settings, setIsPlaying]);

  const stopAnimation = useCallback(() => {
    isPlayingRef.current = false;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsPlaying(false);
    setVisibleCount(messages.length);
    setTypingProgress({});
  }, [messages, setIsPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      setVisibleCount(messages.length);
      setTypingProgress({});
    }
  }, [messages, isPlaying]);

  useEffect(() => {
    if (isExporting) {
      setExportingVideoVisibleCount(0);
    }
  }, [isExporting]);

  // 根据分辨率计算预览尺寸
  const previewDimensions = useMemo(() => {
    const targetHeight = 500;
    const targetWidth = 400;
    
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

  const effectiveVisibleCount = isExporting ? exportingVideoVisibleCount : visibleCount;
  const displayMessages = useMemo(() => {
    const msgs = messages.slice(0, effectiveVisibleCount);
    // 不在导出时应用打字效果
    if (isExporting) return msgs;
    // 在预览播放时应用打字进度
    return msgs.map(msg => ({
      ...msg,
      typingCharCount: typingProgress[msg.id],
    }));
  }, [messages, effectiveVisibleCount, typingProgress, isExporting]);

  const handlePlatformChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const theme = allThemes.find(t => t.id === e.target.value);
    if (theme) setPlatform(theme);
  }, [setPlatform]);

  const handleResolutionChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const option = resolutionOptions.find(o => `${o.width}x${o.height}` === e.target.value);
    if (option) {
      updateSettings({ width: option.width, height: option.height });
    }
  }, [updateSettings]);

  const handleExportImage = async () => {
    if (messages.length === 0) {
      setExportError('请先添加消息');
      return;
    }

    setIsExporting(true);
    setExportError('');
    setExportStatus('');
    setExportProgress(0);

    try {
      const exporter = new Exporter();
      setExportStatus('正在生成图片...');
      setExportProgress(10);

      const title = project.chatTitle || platform.name;

      setExportProgress(50);
      const blob = await exporter.captureImageFromCanvas(
        messages,
        platform.styles,
        settings.width,
        settings.height,
        title,
        users
      );

      setExportProgress(90);
      setExportStatus('正在下载...');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportProgress(100);
      setExportStatus('图片已下载！');
    } catch (err) {
      console.error('Export failed:', err);
      setExportError('导出失败: ' + (err as Error).message);
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportStatus(''), 3000);
    }
  };

  const handleExportVideo = async () => {
    if (messages.length === 0) {
      setExportError('请先添加消息');
      return;
    }
    
    setIsExporting(true);
    setExportError('');
    setExportStatus('');
    setExportProgress(0);

    try {
      const exporter = new Exporter();
      setExportStatus('正在加载 FFmpeg...');
      await exporter.init();

      const platformConfig = { 
        name: project.chatTitle || platform.name, 
        styles: platform.styles,
        deviceType: config.deviceType
      };
      
      setExportStatus('正在录制视频帧（打字动画）...');

      const videoBlob = await exporter.recordVideo(
        previewContainerRef.current!,
        messages,
        settings,
        platformConfig,
        (progress) => {
          setExportProgress(progress);
        }
      );
      
      setExportStatus('正在下载...');
      setExportProgress(95);
      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setExportProgress(100);
      setExportStatus('视频已下载！');
    } catch (err) {
      console.error('Export failed:', err);
      setExportError('导出失败: ' + (err as Error).message);
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportStatus(''), 3000);
    }
  };

  const handleExportHtml = () => {
    if (messages.length === 0) {
      setExportError('请先添加消息');
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
    setExportStatus('HTML 已下载！');
    setTimeout(() => setExportStatus(''), 3000);
  };

  return (
    <div className="space-y-4">
      {/* 顶部控制栏 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="text-lg font-semibold">预览</h2>
          
          {/* 平台选择 */}
          <select
            value={platform.id}
            onChange={handlePlatformChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            {allThemes.map(theme => (
              <option key={theme.id} value={theme.id}>{theme.name}</option>
            ))}
          </select>

          {/* 分辨率选择 */}
          <select
            value={`${settings.width}x${settings.height}`}
            onChange={handleResolutionChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            {resolutionOptions.map(opt => (
              <option key={opt.label} value={`${opt.width}x${opt.height}`}>{opt.label}</option>
            ))}
          </select>

          {/* 私聊/群聊切换 */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setChatType('private')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                !isGroup ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              私聊
            </button>
            <button
              onClick={() => setChatType('group')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                isGroup ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              群聊
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={isPlaying ? stopAnimation : playAnimation}
            className={`px-4 py-2 rounded-lg transition-colors text-sm ${
              isPlaying 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isPlaying ? '停止' : '播放动画'}
          </button>
        </div>
      </div>

      {/* 群聊设置 */}
      {isGroup && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-3">群聊设置</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">群名称</label>
              <input
                type="text"
                value={groupInfo?.name || ''}
                onChange={e => updateGroupInfo({ name: e.target.value })}
                placeholder="群聊"
                className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">成员人数</label>
              <input
                type="number"
                value={groupInfo?.memberCount || ''}
                onChange={e => updateGroupInfo({ memberCount: Number(e.target.value) || undefined })}
                placeholder="20"
                className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">在线人数</label>
              <input
                type="number"
                value={groupInfo?.onlineCount || ''}
                onChange={e => updateGroupInfo({ onlineCount: Number(e.target.value) || undefined })}
                placeholder="15"
                className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* 动画设置 */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">打字速度</label>
            <input
              type="range"
              min="20"
              max="200"
              value={settings.typingSpeed}
              onChange={e => updateSettings({ typingSpeed: Number(e.target.value) })}
              className="w-full"
            />
            <div className="text-sm text-gray-500 text-center">{settings.typingSpeed}ms/字</div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">消息间隔</label>
            <input
              type="range"
              min="200"
              max="2000"
              value={settings.messageInterval}
              onChange={e => updateSettings({ messageInterval: Number(e.target.value) })}
              className="w-full"
            />
            <div className="text-sm text-gray-500 text-center">{settings.messageInterval}ms</div>
          </div>
          {exportType === 'video' && (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">帧率 (FPS)</label>
                <input
                  type="number"
                  value={settings.fps}
                  onChange={e => updateSettings({ fps: Number(e.target.value) })}
                  min="15"
                  max="60"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">码率 (kbps)</label>
                <input
                  type="number"
                  value={settings.videoBitrate}
                  onChange={e => updateSettings({ videoBitrate: Number(e.target.value) })}
                  min="500"
                  max="5000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 预览区 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="flex justify-center p-4 bg-gray-50">
          <div 
            ref={previewContainerRef}
            id="chat-preview-container"
            className="rounded-lg overflow-hidden shadow-lg"
            style={{ 
              width: previewDimensions.width, 
              height: previewDimensions.height,
            }}
          >
            <ChatContainer 
              messages={displayMessages}
              scale={previewDimensions.scale}
            />
          </div>
        </div>
        <div className="text-center text-sm text-gray-500 py-2 border-t">
          预览: {previewDimensions.width}×{previewDimensions.height} | 实际: {settings.width}×{settings.height} | {isMobile ? '手机端' : '电脑端'}
        </div>
      </div>

      {/* 导出控制 */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <h3 className="text-lg font-semibold">导出</h3>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">导出格式:</label>
            <select
              value={exportType}
              onChange={e => setExportType(e.target.value as 'image' | 'video')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="image">图片 (PNG)</option>
              <option value="video">视频 (MP4)</option>
            </select>
          </div>
        </div>

        {exportError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {exportError}
          </div>
        )}

        {exportStatus && !exportError && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-600 text-sm">
            {exportStatus}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportImage}
            disabled={isExporting || messages.length === 0}
            className="flex-1 min-w-[140px] px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
          >
            {isExporting ? '导出中...' : '导出图片'}
          </button>
          <button
            onClick={handleExportVideo}
            disabled={isExporting || messages.length === 0}
            className="flex-1 min-w-[140px] px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
          >
            {isExporting ? '导出中...' : '导出视频'}
          </button>
          <button
            onClick={handleExportHtml}
            disabled={messages.length === 0}
            className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            导出 HTML
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

        <p className="text-xs text-gray-400 mt-3 text-center">
          消息数量: {messages.length} 条 | 分辨率: {settings.width}×{settings.height}
        </p>
      </div>
    </div>
  );
}
