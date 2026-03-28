import type { ExtendedPlatformTheme, PlatformConfig } from './wechat';
import type { VideoRatio, EmojiSet } from '@/types';
import type { ColorScheme } from './colorSchemes';
import type { BaseStyleOverrides, PlatformConfigOverrides } from './templates';
import { getTemplateByDeviceType } from './templates';

export interface PlatformFactoryOptions {
  id: string;
  name: string;
  ratio: VideoRatio;
  emojiSet: EmojiSet;
  deviceType: 'mobile' | 'desktop';
  colorScheme: ColorScheme;
  styleOverrides?: BaseStyleOverrides;
  configOverrides?: PlatformConfigOverrides;
}

export function createPlatform(options: PlatformFactoryOptions): ExtendedPlatformTheme {
  const template = getTemplateByDeviceType(options.deviceType);
  
  const styles = {
    background: options.colorScheme.background,
    bubbleLeftBg: options.colorScheme.bubbleLeftBg,
    bubbleRightBg: options.colorScheme.bubbleRightBg,
    bubbleLeftColor: options.colorScheme.bubbleLeftColor,
    bubbleRightColor: options.colorScheme.bubbleRightColor,
    headerBg: options.colorScheme.headerBg,
    headerColor: options.colorScheme.headerColor,
    fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
    fontSize: template.baseStyle.fontSize,
    bubbleRadius: template.baseStyle.bubbleRadius,
    bubblePadding: template.baseStyle.bubblePadding,
    avatarSize: template.baseStyle.avatarSize,
    messageGap: template.baseStyle.messageGap,
    timeGap: 300,
    bubbleShadow: '0 1px 2px rgba(0,0,0,0.05)',
    deviceType: options.deviceType,
    ...options.styleOverrides,
  };

  return {
    id: options.id,
    name: options.name,
    ratio: options.ratio,
    emojiSet: options.emojiSet,
    styles,
  };
}

export function createPlatformConfig(options: {
  deviceType: 'mobile' | 'desktop';
  showAvatarBorder?: boolean;
  backgroundPattern?: boolean;
  bubbleTriangle?: 'left' | 'right' | 'both' | 'none';
} & PlatformConfigOverrides): PlatformConfig {
  const template = getTemplateByDeviceType(options.deviceType);
  
  return {
    showAvatarBorder: options.showAvatarBorder ?? false,
    bubbleTailDirection: true,
    showReadStatus: options.showReadStatus ?? template.config.showReadStatus,
    customHeader: options.customHeader ?? true,
    backgroundPattern: options.backgroundPattern ?? false,
    bubbleTail: options.bubbleTail ?? template.config.bubbleTail,
    showSenderName: options.showSenderName ?? template.config.showSenderName,
    bubbleTriangle: options.bubbleTriangle ?? template.config.bubbleTriangle,
    deviceType: options.deviceType,
  };
}
