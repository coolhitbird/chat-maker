import type { PlatformTheme, ThemeStyles } from '@/types';
import { createPlatform } from './platformFactory';
import { 
  wechatGreen, 
  wechatDesktopGreen, 
  qqBlue, 
  dingtalkBlue 
} from './colorSchemes';

export interface ExtendedThemeStyles extends ThemeStyles {
  bubbleLeftBorder?: string;
  bubbleRightBorder?: string;
  bubbleShadow?: string;
  inputBg?: string;
  statusBarColor?: string;
  deviceType?: 'mobile' | 'desktop';
}

export interface ExtendedPlatformTheme extends PlatformTheme {
  styles: ExtendedThemeStyles;
}

// 微信手机端 (竖屏) - 使用模板系统
export const wechatMobileTheme: ExtendedPlatformTheme = createPlatform({
  id: 'wechat-mobile',
  name: '微信手机端',
  ratio: '9:16',
  emojiSet: 'wechat',
  deviceType: 'mobile',
  colorScheme: wechatGreen,
});

// 微信电脑端 (横屏) - 使用模板系统
export const wechatDesktopTheme: ExtendedPlatformTheme = createPlatform({
  id: 'wechat-desktop',
  name: '微信电脑端',
  ratio: '16:9',
  emojiSet: 'wechat',
  deviceType: 'desktop',
  colorScheme: wechatDesktopGreen,
});

// 保持向后兼容
export const wechatTheme = wechatMobileTheme;

// QQ - 使用模板系统
export const qqTheme: ExtendedPlatformTheme = createPlatform({
  id: 'qq',
  name: 'QQ',
  ratio: '9:16',
  emojiSet: 'native',
  deviceType: 'mobile',
  colorScheme: qqBlue,
  styleOverrides: {
    bubbleRadius: 8,
    avatarSize: 40,
    bubbleShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  configOverrides: {
    showAvatarBorder: true,
    backgroundPattern: true,
  },
});

// 钉钉 - 使用模板系统
export const dingtalkTheme: ExtendedPlatformTheme = createPlatform({
  id: 'dingtalk',
  name: '钉钉',
  ratio: '16:9',
  emojiSet: 'native',
  deviceType: 'desktop',
  colorScheme: dingtalkBlue,
  styleOverrides: {
    bubbleRadius: 20,
  },
});

export const allThemes: ExtendedPlatformTheme[] = [
  wechatMobileTheme, 
  wechatDesktopTheme, 
  qqTheme, 
  dingtalkTheme
];

export function getDefaultDimensions(platform: PlatformTheme): { width: number; height: number } {
  switch (platform.id) {
    case 'wechat-mobile':
      return { width: 540, height: 960 };
    case 'wechat-desktop':
      return { width: 1280, height: 720 };
    case 'qq':
      return { width: 540, height: 960 };
    case 'dingtalk':
      return { width: 1280, height: 720 };
    case 'wechat':
      return { width: 540, height: 960 };
    default:
      return { width: 540, height: 960 };
  }
}

export interface PlatformConfig {
  showAvatarBorder: boolean;
  bubbleTailDirection: boolean;
  showReadStatus: boolean;
  customHeader: boolean;
  backgroundPattern: boolean;
  bubbleTail: boolean;
  showSenderName: boolean;
  bubbleTriangle: 'left' | 'right' | 'both' | 'none';
  deviceType: 'mobile' | 'desktop';
}

export function getPlatformConfig(platformId: string): PlatformConfig {
  switch (platformId) {
    case 'wechat-mobile':
      return {
        showAvatarBorder: false,
        bubbleTailDirection: true,
        showReadStatus: true,
        customHeader: true,
        backgroundPattern: false,
        bubbleTail: true,
        showSenderName: true,
        bubbleTriangle: 'right',
        deviceType: 'mobile',
      };
    case 'wechat-desktop':
      return {
        showAvatarBorder: false,
        bubbleTailDirection: true,
        showReadStatus: false,
        customHeader: true,
        backgroundPattern: false,
        bubbleTail: false,
        showSenderName: true,
        bubbleTriangle: 'none',
        deviceType: 'desktop',
      };
    case 'wechat':
      return getPlatformConfig('wechat-mobile');
    case 'qq':
      return {
        showAvatarBorder: true,
        bubbleTailDirection: true,
        showReadStatus: false,
        customHeader: true,
        backgroundPattern: true,
        bubbleTail: true,
        showSenderName: true,
        bubbleTriangle: 'right',
        deviceType: 'mobile',
      };
    case 'dingtalk':
      return {
        showAvatarBorder: false,
        bubbleTailDirection: false,
        showReadStatus: false,
        customHeader: true,
        backgroundPattern: false,
        bubbleTail: false,
        showSenderName: true,
        bubbleTriangle: 'none',
        deviceType: 'desktop',
      };
    default:
      return {
        showAvatarBorder: false,
        bubbleTailDirection: false,
        showReadStatus: false,
        customHeader: false,
        backgroundPattern: false,
        bubbleTail: false,
        showSenderName: false,
        bubbleTriangle: 'none',
        deviceType: 'mobile',
      };
  }
}
