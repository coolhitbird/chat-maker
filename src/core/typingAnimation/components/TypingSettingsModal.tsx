import { useState, useEffect, useMemo } from 'react';
import type { TypingAnimationConfig } from '../types';
import { DEFAULT_TYPING_CONFIG } from '../config';
import type { Message } from '@/types';
import { calculateDurationRange } from '../generators';

interface TypingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TypingAnimationConfig;
  onSave: (config: TypingAnimationConfig) => void;
  messages?: Message[];
  onExportVideo?: () => void;
  isExportingVideo?: boolean;
}

export default function TypingSettingsModal({
  isOpen,
  onClose,
  config,
  onSave,
  messages = [],
  onExportVideo,
  isExportingVideo,
}: TypingSettingsModalProps) {
  const [localConfig, setLocalConfig] = useState<TypingAnimationConfig>(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const durationRange = useMemo(() => {
    if (messages.length === 0) return null;
    return calculateDurationRange(messages);
  }, [messages]);

  const handleReset = () => {
    setLocalConfig(DEFAULT_TYPING_CONFIG);
    onSave(DEFAULT_TYPING_CONFIG);
  };

  const updateConfig = (updates: Partial<TypingAnimationConfig>) => {
    const newConfig = { ...localConfig, ...updates };
    setLocalConfig(newConfig);
    onSave(newConfig);
  };

  useEffect(() => {
    if (durationRange) {
      const target = Math.max(durationRange.min, Math.min(durationRange.max, durationRange.recommended));
      if (localConfig.targetDuration !== target) {
        updateConfig({ targetDuration: target });
      }
    }
  }, [durationRange]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            打字动画设置
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              恢复默认
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enabled"
              checked={localConfig.enabled}
              onChange={(e) => updateConfig({ enabled: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
            />
            <label htmlFor="enabled" className="text-gray-900 dark:text-white font-medium">
              启用打字动画
            </label>
          </div>

          <div className={`space-y-4 ${!localConfig.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                打字速度
              </label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">快</span>
                <input
                  type="range"
                  min="30"
                  max="200"
                  value={localConfig.baseSpeed}
                  onChange={(e) => updateConfig({ baseSpeed: Number(e.target.value) })}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <span className="text-xs text-gray-500">慢</span>
              </div>
              <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-1">
                {localConfig.baseSpeed}ms/字
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
                输入模式
              </label>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-16 text-sm text-gray-600 dark:text-gray-300">逐字</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={localConfig.charChance * 100}
                    onChange={(e) => {
                      const val = Number(e.target.value) / 100;
                      const remaining = 1 - val;
                      const wordRatio = localConfig.wordChance / (localConfig.wordChance + localConfig.pasteChance);
                      updateConfig({
                        charChance: val,
                        wordChance: remaining * wordRatio,
                        pasteChance: remaining * (1 - wordRatio),
                      });
                    }}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <span className="w-12 text-sm text-gray-600 dark:text-gray-300 text-right">
                    {Math.round(localConfig.charChance * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-16 text-sm text-gray-600 dark:text-gray-300">按词</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={localConfig.wordChance * 100}
                    onChange={(e) => {
                      const val = Number(e.target.value) / 100;
                      const remaining = 1 - val - localConfig.charChance;
                      updateConfig({
                        wordChance: val,
                        pasteChance: Math.max(0, remaining),
                      });
                    }}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <span className="w-12 text-sm text-gray-600 dark:text-gray-300 text-right">
                    {Math.round(localConfig.wordChance * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-16 text-sm text-gray-600 dark:text-gray-300">粘贴</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={localConfig.pasteChance * 100}
                    onChange={(e) => {
                      const val = Number(e.target.value) / 100;
                      const remaining = 1 - val - localConfig.charChance;
                      updateConfig({
                        pasteChance: val,
                        wordChance: Math.max(0, remaining),
                      });
                    }}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <span className="w-12 text-sm text-gray-600 dark:text-gray-300 text-right">
                    {Math.round(localConfig.pasteChance * 100)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="pauseEnabled"
                checked={localConfig.pauseEnabled}
                onChange={(e) => updateConfig({ pauseEnabled: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <label htmlFor="pauseEnabled" className="text-sm text-gray-700 dark:text-gray-200">
                随机暂停 (概率 {Math.round(localConfig.pauseProbability * 100)}%，暂停 {localConfig.pauseMinDuration}-{localConfig.pauseMaxDuration}ms)
              </label>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">增强效果</h3>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="typoEnabled"
                    checked={localConfig.typoEnabled}
                    onChange={(e) => updateConfig({ typoEnabled: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                  <label htmlFor="typoEnabled" className="text-sm text-gray-700 dark:text-gray-200">
                    模拟打错字
                  </label>
                </div>

                {localConfig.typoEnabled && (
                  <div className="ml-7 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-16">错字概率</span>
                      <input
                        type="range"
                        min="1"
                        max="30"
                        value={localConfig.typoProbability * 100}
                        onChange={(e) => updateConfig({ typoProbability: Number(e.target.value) / 100 })}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                      />
                      <span className="w-10 text-xs text-gray-600 dark:text-gray-300 text-right">
                        {Math.round(localConfig.typoProbability * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-gray-500">删除动画</span>
                      <label className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-200">
                        <input
                          type="radio"
                          name="deleteStyle"
                          checked={localConfig.typoDeleteStyle === 'cursor'}
                          onChange={() => updateConfig({ typoDeleteStyle: 'cursor' })}
                          className="mr-1"
                        />
                        倒退光标
                      </label>
                      <label className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-200">
                        <input
                          type="radio"
                          name="deleteStyle"
                          checked={localConfig.typoDeleteStyle === 'instant'}
                          onChange={() => updateConfig({ typoDeleteStyle: 'instant' })}
                          className="mr-1"
                        />
                        直接退格
                      </label>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-700 dark:text-gray-200">Emoji效果</span>
                  <label className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-200">
                    <input
                      type="radio"
                      name="emojiEffect"
                      checked={localConfig.emojiEffect === 'none'}
                      onChange={() => updateConfig({ emojiEffect: 'none' })}
                      className="mr-1"
                    />
                    无
                  </label>
                  <label className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-200">
                    <input
                      type="radio"
                      name="emojiEffect"
                      checked={localConfig.emojiEffect === 'pop'}
                      onChange={() => updateConfig({ emojiEffect: 'pop' })}
                      className="mr-1"
                    />
                    弹出
                  </label>
                  <label className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-200">
                    <input
                      type="radio"
                      name="emojiEffect"
                      checked={localConfig.emojiEffect === 'sparkle'}
                      onChange={() => updateConfig({ emojiEffect: 'sparkle' })}
                      className="mr-1"
                    />
                    闪烁
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="cursorEnabled"
                    checked={localConfig.cursorEnabled}
                    onChange={(e) => updateConfig({ cursorEnabled: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                  <label htmlFor="cursorEnabled" className="text-sm text-gray-700 dark:text-gray-200">
                    显示打字光标
                  </label>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">导出选项</h3>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="fastMode"
                  checked={localConfig.fastMode}
                  onChange={(e) => updateConfig({ fastMode: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />
                <label htmlFor="fastMode" className="text-sm text-gray-700 dark:text-gray-200">
                  快速导出（跳过动画）
                </label>
              </div>

              {!localConfig.fastMode && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    目标视频时长
                  </label>
                  {durationRange && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-3">
                      <div className="text-xs text-blue-600 dark:text-blue-300">
                        可选范围：<span className="font-semibold">{durationRange.min}</span> 秒 ~ <span className="font-semibold">{durationRange.max}</span> 秒
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">短</span>
                    <input
                      type="range"
                      min={durationRange?.min || 5}
                      max={durationRange?.max || 60}
                      step="1"
                      value={localConfig.targetDuration}
                      onChange={(e) => updateConfig({ targetDuration: Number(e.target.value) })}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    />
                    <span className="text-xs text-gray-500">长</span>
                  </div>
                  <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-1">
                    约 <span className="font-semibold text-gray-900 dark:text-white">{localConfig.targetDuration}</span> 秒
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">渲染模式</h3>

              <div className="space-y-2">
                <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${localConfig.renderMode === 'simple' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                  <input
                    type="radio"
                    name="renderMode"
                    value="simple"
                    checked={localConfig.renderMode === 'simple'}
                    onChange={() => updateConfig({ renderMode: 'simple' })}
                    className="mt-1"
                  />
                  <div>
                    <div className={`text-sm font-medium ${localConfig.renderMode === 'simple' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'}`}>简洁模式 ⭐</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Canvas逐帧渲染，消息从上到下依次出现，支持打字动画和所有消息类型，生成速度快
                    </div>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${localConfig.renderMode === 'loop' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                  <input
                    type="radio"
                    name="renderMode"
                    value="loop"
                    checked={localConfig.renderMode === 'loop'}
                    onChange={() => updateConfig({ renderMode: 'loop' })}
                    className="mt-1"
                  />
                  <div>
                    <div className={`text-sm font-medium ${localConfig.renderMode === 'loop' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'}`}>循环渲染模式</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      消息从底部向上堆叠，内容满屏后自动滚动，支持引用块、语音STT等高级效果，适合长对话
                    </div>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${localConfig.renderMode === 'content' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                  <input
                    type="radio"
                    name="renderMode"
                    value="content"
                    checked={localConfig.renderMode === 'content'}
                    onChange={() => updateConfig({ renderMode: 'content' })}
                    className="mt-1"
                  />
                  <div>
                    <div className={`text-sm font-medium ${localConfig.renderMode === 'content' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'}`}>内容修改模式</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      与循环渲染类似，支持消息内容动态修改显示，引用块垂直居中，适合需要精细排版效果的导出
                    </div>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${localConfig.renderMode === 'dom' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                  <input
                    type="radio"
                    name="renderMode"
                    value="dom"
                    checked={localConfig.renderMode === 'dom'}
                    onChange={() => updateConfig({ renderMode: 'dom' })}
                    className="mt-1"
                  />
                  <div>
                    <div className={`text-sm font-medium ${localConfig.renderMode === 'dom' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'}`}>DOM 动画模式</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      实验性功能，渲染速度慢且部分效果不完整，暂不推荐使用
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {messages.length > 0 && (
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {localConfig.fastMode ? (
                    <>快速模式：约 <span className="font-semibold text-gray-900 dark:text-white">{Math.round(messages.length * 1.5)}</span> 秒</>
                  ) : durationRange ? (
                    <>
                      时长范围：<span className="font-semibold text-gray-900 dark:text-white">{durationRange.min}</span> 秒 ~ <span className="font-semibold text-gray-900 dark:text-white">{durationRange.max}</span> 秒
                      {localConfig.targetDuration >= durationRange.min && localConfig.targetDuration <= durationRange.max && (
                        <span className="ml-2">（已选 <span className="font-semibold text-blue-600">{localConfig.targetDuration}</span> 秒）</span>
                      )}
                    </>
                  ) : (
                    <>消息数量：<span className="font-semibold text-gray-900 dark:text-white">{messages.length}</span> 条</>
                  )}
                </div>
              </div>
            )}

            {onExportVideo && (
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                <div className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
                  操作区域
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={onExportVideo}
                    disabled={isExportingVideo}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isExportingVideo ? '导出中...' : '导出视频'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
