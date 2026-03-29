import { useState, useEffect } from 'react';
import type { TypingAnimationConfig } from '../types';
import { DEFAULT_TYPING_CONFIG } from '../config';

interface TypingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TypingAnimationConfig;
  onSave: (config: TypingAnimationConfig) => void;
  estimatedDuration?: number;
}

export default function TypingSettingsModal({
  isOpen,
  onClose,
  config,
  onSave,
  estimatedDuration,
}: TypingSettingsModalProps) {
  const [localConfig, setLocalConfig] = useState<TypingAnimationConfig>(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  const handleReset = () => {
    setLocalConfig(DEFAULT_TYPING_CONFIG);
  };

  const updateConfig = (updates: Partial<TypingAnimationConfig>) => {
    setLocalConfig(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            打字动画设置
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none"
          >
            &times;
          </button>
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
                <span className="text-xs text-gray-500">慢</span>
                <input
                  type="range"
                  min="30"
                  max="200"
                  value={localConfig.baseSpeed}
                  onChange={(e) => updateConfig({ baseSpeed: Number(e.target.value) })}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <span className="text-xs text-gray-500">快</span>
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
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">渲染模式</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                不同模式渲染效果和兼容性不同，可尝试切换找到最适合的配置
              </p>

              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <input
                    type="radio"
                    name="renderMode"
                    value="loop"
                    checked={localConfig.renderMode === 'loop'}
                    onChange={() => updateConfig({ renderMode: 'loop' })}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-200">循环渲染模式 (推荐)</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      复用现有视频导出循环结构，兼容性好，支持滚动
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <input
                    type="radio"
                    name="renderMode"
                    value="content"
                    checked={localConfig.renderMode === 'content'}
                    onChange={() => updateConfig({ renderMode: 'content' })}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-200">内容修改模式</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      修改消息内容后通过 Canvas 渲染，需要 Canvas 支持打字参数
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <input
                    type="radio"
                    name="renderMode"
                    value="dom"
                    checked={localConfig.renderMode === 'dom'}
                    onChange={() => updateConfig({ renderMode: 'dom' })}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-200">DOM 动画模式</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      基于 CSS 动画的 DOM 渲染，效果最真实但渲染较慢
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {estimatedDuration !== undefined && (
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  预估导出时长：约 <span className="font-semibold text-gray-900 dark:text-white">{estimatedDuration}</span> 秒
                </div>
                {localConfig.fastMode && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    开启快速导出可大幅缩短导出时间
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
          >
            恢复默认
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
