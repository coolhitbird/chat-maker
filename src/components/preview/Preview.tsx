import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { getPlatformConfig } from '@/themes/wechat';
import ChatContainer from './ChatContainer';

export default function Preview() {
  const { project, isPlaying, setIsPlaying, updateSettings, setPreviewRef, isExporting, exportingVideoVisibleCount, setExportingVideoVisibleCount } = useChatStore();
  const { platform, messages, settings } = project;
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const animationRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);

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

    for (let i = 0; i < messages.length; i++) {
      if (!isPlayingRef.current) break;
      
      setVisibleCount(i + 1);
      await new Promise(resolve => setTimeout(resolve, settings.messageInterval));
    }

    isPlayingRef.current = false;
    setIsPlaying(false);
  }, [messages, settings, setIsPlaying]);

  const stopAnimation = useCallback(() => {
    isPlayingRef.current = false;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsPlaying(false);
    setVisibleCount(messages.length);
  }, [messages, setIsPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      setVisibleCount(messages.length);
    }
  }, [messages, isPlaying]);

  useEffect(() => {
    if (isExporting) {
      setExportingVideoVisibleCount(0);
    }
  }, [isExporting]);

  // 根据分辨率计算预览尺寸
  // 导出时使用全分辨率，scale=1
  const previewDimensions = useMemo(() => {
    if (isExporting) {
      return {
        width: settings.width,
        height: settings.height,
        scale: 1,
      };
    }

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
  }, [settings.width, settings.height, isMobile, isExporting]);

  // 计算要显示的消息列表
  // 导出时使用 exportingVideoVisibleCount，否则使用 visibleCount
  const effectiveVisibleCount = isExporting ? exportingVideoVisibleCount : visibleCount;
  const displayMessages = useMemo(() => {
    return messages.slice(0, effectiveVisibleCount);
  }, [messages, effectiveVisibleCount]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">预览 - {platform.name}</h2>
        <div className="flex gap-2">
          <button
            onClick={isPlaying ? stopAnimation : playAnimation}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isPlaying 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isPlaying ? '停止' : '播放动画'}
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 space-y-3">
          <label className="block text-sm font-medium text-gray-700">打字速度 (ms/字)</label>
          <input
            type="range"
            min="20"
            max="200"
            value={settings.typingSpeed}
            onChange={e => updateSettings({ typingSpeed: Number(e.target.value) })}
            className="w-full"
          />
          <div className="text-sm text-gray-500">{settings.typingSpeed}ms</div>
        </div>
        <div className="flex-1 space-y-3">
          <label className="block text-sm font-medium text-gray-700">消息间隔 (ms)</label>
          <input
            type="range"
            min="200"
            max="2000"
            value={settings.messageInterval}
            onChange={e => updateSettings({ messageInterval: Number(e.target.value) })}
            className="w-full"
          />
          <div className="text-sm text-gray-500">{settings.messageInterval}ms</div>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="border-2 border-gray-300 rounded-lg overflow-hidden shadow-xl bg-white">
          <div 
            ref={previewContainerRef}
            id="chat-preview-container"
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
      </div>

      <div className="text-center text-sm text-gray-500">
        分辨率: {settings.width} × {settings.height} | {isMobile ? '手机端' : '电脑端'}
      </div>
    </div>
  );
}
