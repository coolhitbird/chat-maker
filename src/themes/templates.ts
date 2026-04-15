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
    fontSize: 17,        // 微信标准 16-17pt
    bubbleRadius: 18,    // 大圆角 18-20px
    avatarSize: 48,      // 微信头像 48px
    messageGap: 10,
    bubblePadding: 10,   // 上下10px（左右在 platformFactory 里单独处理）
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
    bubbleRadius: 10,
    avatarSize: 40,
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
