import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { getPlatformConfig } from '@/themes/wechat';
import { allThemes } from '@/themes';
import { Exporter } from '@/core/exporter';
import ChatContainer from './ChatContainer';
import { TypingSettingsModal, generateTypingSequence, loopTypingRenderer, contentTypingRenderer, domTypingRenderer, calculateDurationRange } from '@/core/typingAnimation';
import { typingVideoExporter } from '@/core/typingAnimation/exporters/VideoExporter';
import type { TypingAnimationConfig, MessageTypingSequence } from '@/core/typingAnimation';
import { DEFAULT_TYPING_CONFIG } from '@/core/typingAnimation';
import type { ExportConfig } from '@/core/typingAnimation';

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
    setPlatform,
    userSettings
  } = useChatStore();
  
  const { platform, messages, settings, chatType, groupInfo, users } = project;
  const isGroup = chatType === 'group';
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const [typingProgress, setTypingProgress] = useState<Record<string, number>>({});
  const animationRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [exportError, setExportError] = useState<string>('');
  const [showTypingSettings, setShowTypingSettings] = useState(false);
  const [typingConfig, setTypingConfig] = useState<TypingAnimationConfig>(DEFAULT_TYPING_CONFIG);
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [simpleExportDuration, setSimpleExportDuration] = useState(5);

  const durationRange = useMemo(() => {
    if (messages.length === 0) return null;
    return calculateDurationRange(messages);
  }, [messages, typingConfig.enabled, typingConfig.fastMode, typingConfig.baseSpeed]);

  const simpleDurationRange = useMemo(() => {
    if (messages.length === 0) return { min: 1, max: 10 };
    const standardDuration = messages.length * 0.5;
    const min = Math.max(1, Math.round(standardDuration / 4));
    const max = Math.max(min + 2, Math.round(standardDuration / 0.1));
    return { min, max };
  }, [messages]);

  const handleTypingConfigSave = useCallback((config: TypingAnimationConfig) => {
    setTypingConfig(config);
  }, []);

  const handleExportTypingVideo = useCallback(async () => {
    if (messages.length === 0) {
      alert('没有消息，请先添加对话');
      return;
    }
    if (isExportingVideo) return;

    setIsExportingVideo(true);
    setExportStatus('正在准备导出动画视频...');

    try {
      const exportConfig: ExportConfig = {
        fps: 30,
        width: settings.width,
        height: settings.height,
        styles: {
          fontFamily: 'Microsoft YaHei, PingFang SC, sans-serif',
          fontSize: 16,
          avatarSize: 40,
          bubblePadding: 12,
          bubbleRadius: 18,
          bubbleLeftBg: '#ffffff',
          bubbleRightBg: '#95ec69',
          bubbleLeftColor: '#1a1a1a',
          bubbleRightColor: '#1a1a1a',
          background: '#f5f5f5',
          headerBg: '#f5f5f5',
          headerColor: '#1a1a1a',
        },
      };

      const config = { ...typingConfig, enabled: true };

      let videoBlob: Blob;
      const renderMode = typingConfig.renderMode;

      if (renderMode === 'simple') {
        setExportStatus(`正在导出... (简洁模式)`);
        videoBlob = await typingVideoExporter.export(
          messages,
          config,
          exportConfig,
          [],
          false,
          (progress) => {
            setExportStatus(`正在导出... ${progress}%`);
          }
        );
      } else if (renderMode === 'loop') {
        setExportStatus(`正在导出... (循环渲染模式)`);
        videoBlob = await loopTypingRenderer.render(
          messages,
          config,
          exportConfig,
          [],
          false,
          (progress) => {
            setExportStatus(`正在导出... ${progress}%`);
          }
        );
      } else if (renderMode === 'content') {
        setExportStatus(`正在导出... (内容修改模式)`);
        videoBlob = await contentTypingRenderer.render(
          messages,
          config,
          exportConfig,
          [],
          false,
          (progress) => {
            setExportStatus(`正在导出... ${progress}%`);
          }
        );
      } else {
        setExportStatus(`正在导出... (DOM动画模式)`);
        videoBlob = await domTypingRenderer.render(
          messages,
          config,
          exportConfig,
          [],
          false,
          (progress) => {
            setExportStatus(`正在导出... ${progress}%`);
          }
        );
      }

      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `typing-animation-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportStatus('导出成功！');
      setTimeout(() => setExportStatus(''), 2000);
    } catch (err) {
      console.error('Export error:', err);
      setExportError((err as Error).message);
      setExportStatus('');
    } finally {
      setIsExportingVideo(false);
    }
  }, [messages, typingConfig, settings, isExportingVideo]);

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

    const useTypingAnim = typingConfig.enabled && !typingConfig.fastMode;
    let sequences: Map<string, MessageTypingSequence> = new Map();
    
    if (useTypingAnim) {
      for (const msg of messages) {
        if (msg.type !== 'system') {
          sequences.set(msg.id, generateTypingSequence(msg, typingConfig));
        }
      }
    }

    for (let i = 0; i < messages.length; i++) {
      if (!isPlayingRef.current) break;
      
      const msg = messages[i];
      
      if (msg.type === 'system') {
        setVisibleCount(i + 1);
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        setVisibleCount(i + 1);
        
        if (useTypingAnim) {
          const seq = sequences.get(msg.id);
          if (seq) {
            let startTime = Date.now();
            const startTimestamp = seq.events[0]?.timestamp || 0;
            
            while (true) {
              const elapsed = Date.now() - startTime;
              const currentTimestamp = startTimestamp + elapsed;
              
              const visible = getVisibleTextAtTimestamp(seq, currentTimestamp);
              setTypingProgress(prev => ({ ...prev, [msg.id]: visible.length }));
              
              if (currentTimestamp >= seq.totalDuration) break;
              if (!isPlayingRef.current) break;
              
              await new Promise(resolve => setTimeout(resolve, 16));
            }
          }
          setTypingProgress(prev => ({ ...prev, [msg.id]: msg.content?.length || 0 }));
        } else {
          const content = msg.content || '';
          const charDelay = 50;
          
          for (let charIdx = 1; charIdx <= content.length; charIdx++) {
            if (!isPlayingRef.current) break;
            setTypingProgress(prev => ({ ...prev, [msg.id]: charIdx }));
            await new Promise(resolve => setTimeout(resolve, charDelay));
          }
          
          setTypingProgress(prev => ({ ...prev, [msg.id]: content.length }));
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    isPlayingRef.current = false;
    setIsPlaying(false);
    setTypingProgress({});
  }, [messages, setIsPlaying, typingConfig]);

  function getVisibleTextAtTimestamp(seq: MessageTypingSequence, timestamp: number): string {
    let text = '';
    
    for (const event of seq.events) {
      if (event.timestamp > timestamp) break;
      
      switch (event.type) {
        case 'char':
          text += event.content;
          break;
        case 'emoji':
          text += event.content;
          break;
        case 'backspace':
          if (text.length > 0) {
            text = text.slice(0, -1);
          }
          break;
        case 'pause':
          break;
        case 'paste-flash':
          text += event.content;
          break;
      }
    }
    
    return text;
  }

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
        users,
        userSettings.theme === 'dark'
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
      if (typingConfig.enabled) {
        const renderMode = typingConfig.renderMode || 'loop';
        let renderer;
        let rendererName = '';

        switch (renderMode) {
          case 'loop':
            renderer = loopTypingRenderer;
            rendererName = '循环渲染';
            break;
          case 'content':
            renderer = contentTypingRenderer;
            rendererName = '内容修改';
            break;
          case 'dom':
            renderer = domTypingRenderer;
            rendererName = 'DOM动画';
            break;
          default:
            renderer = loopTypingRenderer;
            rendererName = '循环渲染';
        }

        setExportStatus(`正在加载 FFmpeg (${rendererName}模式)...`);
        await renderer.init();

        setExportStatus(`正在生成视频帧 (${rendererName}模式)...`);

        const platformStyles = platform.styles || {};

        const videoBlob = await renderer.render(
          messages,
          typingConfig,
          {
            width: settings.width,
            height: settings.height,
            fps: settings.fps,
            styles: platformStyles,
          },
          users,
          userSettings.theme === 'dark',
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
      } else {
        const exporter = new Exporter();
        setExportStatus('正在加载 FFmpeg...');
        await exporter.init();

        const platformConfig = { 
          name: project.chatTitle || platform.name, 
          styles: platform.styles,
          deviceType: config.deviceType
        };
        
        setExportStatus('正在录制视频帧...');

        const framesPerMessage = Math.round((simpleExportDuration / messages.length) * settings.fps);
        
        const videoBlob = await exporter.recordVideo(
          previewContainerRef.current!,
          messages,
          settings,
          platformConfig,
          (progress) => {
            setExportProgress(progress);
          },
          userSettings.theme === 'dark',
          framesPerMessage
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
      }
    } catch (err) {
      console.error('Export failed:', err);
      setExportError('导出失败: ' + (err as Error).message);
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportStatus(''), 3000);
    }
  };

  return (
    <div className="space-y-4">
      {/* 顶部控制栏 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="text-lg font-semibold dark:text-white">预览</h2>
          
          {/* 平台选择 */}
          <select
            value={platform.id}
            onChange={handlePlatformChange}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            {allThemes.map(theme => (
              <option key={theme.id} value={theme.id}>{theme.name}</option>
            ))}
          </select>

          {/* 分辨率选择 */}
          <select
            value={`${settings.width}x${settings.height}`}
            onChange={handleResolutionChange}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            {resolutionOptions.map(opt => (
              <option key={opt.label} value={`${opt.width}x${opt.height}`}>{opt.label}</option>
            ))}
          </select>

          {/* 私聊/群聊切换 */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setChatType('private')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                !isGroup 
                  ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              私聊
            </button>
            <button
              onClick={() => setChatType('group')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                isGroup 
                  ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
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
          <button
            onClick={() => setShowTypingSettings(true)}
            className={`px-4 py-2 rounded-lg transition-colors text-sm border ${
              typingConfig.enabled
                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
          >
            动画设置
          </button>
        </div>
      </div>

      {/* 群聊设置 */}
      {isGroup && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-3">群聊设置</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">群名称</label>
              <input
                type="text"
                value={groupInfo?.name || ''}
                onChange={e => updateGroupInfo({ name: e.target.value })}
                placeholder="群聊"
                className="w-full px-3 py-2 border border-blue-200 dark:border-blue-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">成员人数</label>
              <input
                type="number"
                value={groupInfo?.memberCount || ''}
                onChange={e => updateGroupInfo({ memberCount: Number(e.target.value) || undefined })}
                placeholder="20"
                className="w-full px-3 py-2 border border-blue-200 dark:border-blue-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">在线人数</label>
              <input
                type="number"
                value={groupInfo?.onlineCount || ''}
                onChange={e => updateGroupInfo({ onlineCount: Number(e.target.value) || undefined })}
                placeholder="15"
                className="w-full px-3 py-2 border border-blue-200 dark:border-blue-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </div>
      )}

      {/* 预览区 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="flex justify-center p-4 bg-gray-50 dark:bg-gray-900">
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
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-2 border-t dark:border-gray-700">
          预览: {previewDimensions.width}×{previewDimensions.height} | 实际: {settings.width}×{settings.height} | {isMobile ? '手机端' : '电脑端'}
        </div>
      </div>

      {/* 导出控制 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold dark:text-white mb-4">导出</h3>

        {exportError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {exportError}
          </div>
        )}

        {exportStatus && !exportError && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-600 dark:text-blue-400 text-sm">
            {exportStatus}
          </div>
        )}

        {/* 导出图片按钮 */}
        <button
          onClick={handleExportImage}
          disabled={isExporting || messages.length === 0}
          className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm mb-2"
        >
          {isExporting ? '导出中...' : '导出图片'}
        </button>

        {/* 导出视频按钮 */}
        <button
          onClick={handleExportVideo}
          disabled={isExporting || messages.length === 0}
          className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm mb-4"
        >
          {isExporting ? '导出中...' : '导出视频'}
        </button>

        {/* 视频设置 */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">视频设置</h4>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">帧率</label>
              <select
                value={settings.fps}
                onChange={e => updateSettings({ fps: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="15">15fps (省空间)</option>
                <option value="24">24fps (电影感)</option>
                <option value="30">30fps (推荐)</option>
                <option value="45">45fps (超流畅)</option>
                <option value="60">60fps (电竞级)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">码率</label>
              <select
                value={settings.videoBitrate}
                onChange={e => updateSettings({ videoBitrate: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="1000">1000k (标清)</option>
                <option value="2000">2000k (高清)</option>
                <option value="5000">5000k (超清)</option>
              </select>
            </div>
          </div>

          {typingConfig.enabled && !typingConfig.fastMode && durationRange && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                动画视频时长: <span className="text-blue-600 dark:text-blue-400">{typingConfig.targetDuration}</span> 秒
              </label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{durationRange.min}s</span>
                <input
                  type="range"
                  min={durationRange.min}
                  max={durationRange.max}
                  step="1"
                  value={typingConfig.targetDuration}
                  onChange={e => setTypingConfig(prev => ({ ...prev, targetDuration: Number(e.target.value) }))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{durationRange.max}s</span>
              </div>
            </div>
          )}

          {!typingConfig.enabled && simpleDurationRange && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                视频时长: <span className="text-blue-600 dark:text-blue-400">{simpleExportDuration}</span> 秒
              </label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{simpleDurationRange.min}s (最快4x)</span>
                <input
                  type="range"
                  min={simpleDurationRange.min}
                  max={simpleDurationRange.max}
                  step="1"
                  value={simpleExportDuration}
                  onChange={e => setSimpleExportDuration(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{simpleDurationRange.max}s (最慢0.1x)</span>
              </div>
            </div>
          )}
        </div>

        {isExporting && (
          <div className="mt-4">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${useChatStore.getState().exportProgress}%` }}
              />
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-center">
              导出进度: {useChatStore.getState().exportProgress}%
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 text-center">
          消息数量: {messages.length} 条 | 分辨率: {settings.width}×{settings.height}
        </p>
      </div>

      <TypingSettingsModal
        isOpen={showTypingSettings}
        onClose={() => setShowTypingSettings(false)}
        config={typingConfig}
        onSave={handleTypingConfigSave}
        messages={messages}
        onOpenDebugPreview={() => {
          if (messages.length === 0) {
            alert('没有消息，请先添加对话');
            return;
          }
          import('@/core/typingAnimation/debugPreview').then(({ downloadDebugHtml }) => {
            downloadDebugHtml({
              messages: messages,
              config: { ...typingConfig, enabled: true },
              width: 375,
              height: 667,
            });
          });
        }}
        onExportVideo={handleExportTypingVideo}
        isExportingVideo={isExportingVideo}
      />
    </div>
  );
}
