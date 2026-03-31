export interface BaseLayoutConfig {
  width: number;
  height: number;
  headerHeight: number;
  avatarSize: number;
  fontSize: number;
  bubblePadding: number;
  bubbleRadius: number;
  gap: number;
  contentPadding: number;
  maxBubbleWidthRatio: number;
}

export const BASE_CONFIG: BaseLayoutConfig = {
  width: 375,
  height: 667,
  headerHeight: 48,
  avatarSize: 40,
  fontSize: 16,
  bubblePadding: 12,
  bubbleRadius: 18,
  gap: 10,
  contentPadding: 10,
  maxBubbleWidthRatio: 0.65,
};

export function calculateScaleFactor(targetWidth: number, targetHeight: number): number {
  const scaleX = targetWidth / BASE_CONFIG.width;
  const scaleY = targetHeight / BASE_CONFIG.height;
  return Math.min(scaleX, scaleY);
}

export function scaleConfig(targetWidth: number, targetHeight: number): BaseLayoutConfig {
  const scale = calculateScaleFactor(targetWidth, targetHeight);
  
  return {
    width: targetWidth,
    height: targetHeight,
    headerHeight: Math.round(BASE_CONFIG.headerHeight * scale),
    avatarSize: Math.round(BASE_CONFIG.avatarSize * scale),
    fontSize: Math.round(BASE_CONFIG.fontSize * scale),
    bubblePadding: Math.round(BASE_CONFIG.bubblePadding * scale),
    bubbleRadius: Math.round(BASE_CONFIG.bubbleRadius * scale),
    gap: Math.round(BASE_CONFIG.gap * scale),
    contentPadding: Math.round(BASE_CONFIG.contentPadding * scale),
    maxBubbleWidthRatio: BASE_CONFIG.maxBubbleWidthRatio,
  };
}

export function scaleValue(value: number, scale: number): number {
  return Math.round(value * scale);
}
