import type { TypingAnimationConfig } from './types';

export const DEFAULT_TYPING_CONFIG: TypingAnimationConfig = {
  enabled: false,
  renderMode: 'simple',
  baseSpeed: 80,
  speedVariance: 40,
  charChance: 0.5,
  wordChance: 0.3,
  pasteChance: 0.2,
  pasteMinLength: 3,
  pasteMaxLength: 8,
  pasteAnimation: 'flash',
  pauseEnabled: true,
  pauseProbability: 0.1,
  pauseMinDuration: 500,
  pauseMaxDuration: 1500,
  typoEnabled: false,
  typoProbability: 0.08,
  typoDeleteStyle: 'cursor',
  emojiEnabled: true,
  emojiEffect: 'pop',
  cursorEnabled: true,
  cursorBlinkRate: 530,
  fastMode: false,
  targetDuration: 30,
};

export function createTypingConfig(partial?: Partial<TypingAnimationConfig>): TypingAnimationConfig {
  return { ...DEFAULT_TYPING_CONFIG, ...partial };
}

export function validateTypingConfig(config: TypingAnimationConfig): boolean {
  const total = config.charChance + config.wordChance + config.pasteChance;
  if (Math.abs(total - 1) > 0.01) {
    console.warn('[TypingAnimation] charChance + wordChance + pasteChance should equal 1, got:', total);
  }
  return true;
}
