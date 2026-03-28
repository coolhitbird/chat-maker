import type { VideoRatio, EmojiSet } from '@/types';
import type { ColorScheme } from './colorSchemes';

export interface BaseStyleOverrides {
  fontSize?: number;
  bubbleRadius?: number;
  avatarSize?: number;
  messageGap?: number;
  timeGap?: number;
  bubblePadding?: number;
  bubbleShadow?: string;
  bubbleLeftBorder?: string;
  bubbleRightBorder?: string;
  inputBg?: string;
  statusBarColor?: string;
}

export interface PlatformConfigOverrides {
  showAvatarBorder?: boolean;
  bubbleTailDirection?: boolean;
  showReadStatus?: boolean;
  customHeader?: boolean;
  backgroundPattern?: boolean;
  bubbleTail?: boolean;
  showSenderName?: boolean;
  bubbleTriangle?: 'left' | 'right' | 'both' | 'none';
}

export interface CreatePlatformOptions {
  id: string;
  name: string;
  ratio: VideoRatio;
  emojiSet: EmojiSet;
  deviceType: 'mobile' | 'desktop';
  colorScheme: ColorScheme;
  styleOverrides?: BaseStyleOverrides;
  configOverrides?: PlatformConfigOverrides;
}

export interface MobileTemplate {
  type: 'mobile';
  baseStyle: {
    fontSize: number;
    bubbleRadius: number;
    avatarSize: number;
    messageGap: number;
    bubblePadding: number;
  };
  config: {
    deviceType: 'mobile';
    showReadStatus: boolean;
    bubbleTail: boolean;
    bubbleTriangle: 'right';
    showSenderName: boolean;
  };
}

export interface DesktopTemplate {
  type: 'desktop';
  baseStyle: {
    fontSize: number;
    bubbleRadius: number;
    avatarSize: number;
    messageGap: number;
    bubblePadding: number;
  };
  config: {
    deviceType: 'desktop';
    showReadStatus: boolean;
    bubbleTail: boolean;
    bubbleTriangle: 'none';
    showSenderName: boolean;
  };
}

export type DeviceTemplate = MobileTemplate | DesktopTemplate;

export const mobileTemplate: MobileTemplate = {
  type: 'mobile',
  baseStyle: {
    fontSize: 15,
    bubbleRadius: 10,
    avatarSize: 42,
    messageGap: 10,
    bubblePadding: 8,
  },
  config: {
    deviceType: 'mobile',
    showReadStatus: true,
    bubbleTail: true,
    bubbleTriangle: 'right',
    showSenderName: true,
  },
};

export const desktopTemplate: DesktopTemplate = {
  type: 'desktop',
  baseStyle: {
    fontSize: 14,
    bubbleRadius: 6,
    avatarSize: 36,
    messageGap: 8,
    bubblePadding: 10,
  },
  config: {
    deviceType: 'desktop',
    showReadStatus: false,
    bubbleTail: false,
    bubbleTriangle: 'none',
    showSenderName: true,
  },
};

export function getTemplateByDeviceType(deviceType: 'mobile' | 'desktop'): DeviceTemplate {
  return deviceType === 'mobile' ? mobileTemplate : desktopTemplate;
}
