import { describe, expect, it } from 'vitest';
import { calculateVoiceBubbleHeight } from './canvasRenderer';

type MockCanvasTextMetrics = { width: number };

function createMockCtx(measureWidth: (text: string) => number): CanvasRenderingContext2D {
  return {
    measureText: (text: string) => ({ width: measureWidth(text) } as MockCanvasTextMetrics),
  } as unknown as CanvasRenderingContext2D;
}

describe('calculateVoiceBubbleHeight', () => {
  it('uses actual bubble width to wrap voice text', () => {
    const ctx = createMockCtx(text => text.length * 10);
    const voiceText = 'Hello world';
    const lineHeightPx = 18;
    const voiceBubbleHeight = 40;
    const voiceTextPadding = 12;
    const emojiSize = 18;

    const wideHeight = calculateVoiceBubbleHeight(
      ctx,
      voiceText,
      200,
      24,
      emojiSize,
      lineHeightPx,
      voiceBubbleHeight,
      voiceTextPadding,
    );

    const narrowHeight = calculateVoiceBubbleHeight(
      ctx,
      voiceText,
      100,
      24,
      emojiSize,
      lineHeightPx,
      voiceBubbleHeight,
      voiceTextPadding,
    );

    expect(wideHeight).toBe(40 + lineHeightPx + voiceTextPadding * 2);
    expect(narrowHeight).toBeGreaterThan(wideHeight);
  });

  it('calculates one-line height correctly for short voice text', () => {
    const ctx = createMockCtx(text => text.length * 8);
    const voiceText = '短消息';
    const lineHeightPx = 20;
    const voiceBubbleHeight = 40;
    const voiceTextPadding = 10;
    const emojiSize = 20;
    const height = calculateVoiceBubbleHeight(
      ctx,
      voiceText,
      200,
      24,
      emojiSize,
      lineHeightPx,
      voiceBubbleHeight,
      voiceTextPadding,
    );

    expect(height).toBe(40 + 20 + 10 * 2);
  });
});
