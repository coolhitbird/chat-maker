import type { PlatformTheme, ThemeStyles } from '@/types';

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

// 微信手机端 (竖屏)
export const wechatMobileTheme: ExtendedPlatformTheme = {
  id: 'wechat-mobile',
  name: '微信手机端',
  ratio: '9:16',
  emojiSet: 'wechat',
  styles: {
    background: '#e8e8e8',
    bubbleLeftBg: '#ffffff',
    bubbleRightBg: '#9fea58',
    bubbleLeftColor: '#192020',
    bubbleRightColor: '#192020',
    headerBg: '#191919',
    headerColor: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
    fontSize: 15,
    bubbleRadius: 10,
    bubblePadding: 8,
    avatarSize: 42,
    messageGap: 10,
    timeGap: 300,
    bubbleShadow: '0 1px 2px rgba(0,0,0,0.05)',
    deviceType: 'mobile',
  },
};

// 微信电脑端 (横屏)
export const wechatDesktopTheme: ExtendedPlatformTheme = {
  id: 'wechat-desktop',
  name: '微信电脑端',
  ratio: '16:9',
  emojiSet: 'wechat',
  styles: {
    background: '#f5f5f5',
    bubbleLeftBg: '#ffffff',
    bubbleRightBg: '#95ec69',
    bubbleLeftColor: '#333333',
    bubbleRightColor: '#333333',
    headerBg: '#2e2e2e',
    headerColor: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
    fontSize: 14,
    bubbleRadius: 6,
    bubblePadding: 10,
    avatarSize: 36,
    messageGap: 8,
    timeGap: 300,
    bubbleShadow: '0 1px 3px rgba(0,0,0,0.08)',
    deviceType: 'desktop',
  },
};

// 保持向后兼容
export const wechatTheme = wechatMobileTheme;

export const qqTheme: ExtendedPlatformTheme = {
  id: 'qq',
  name: 'QQ',
  ratio: '9:16',
  emojiSet: 'native',
  styles: {
    background: '#e8e8ed',
    bubbleLeftBg: '#ffffff',
    bubbleRightBg: '#b8e864',
    bubbleLeftColor: '#000000',
    bubbleRightColor: '#000000',
    headerBg: '#11b7f4',
    headerColor: '#ffffff',
    fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
    fontSize: 14,
    bubbleRadius: 8,
    bubblePadding: 8,
    avatarSize: 40,
    messageGap: 8,
    timeGap: 300,
    bubbleShadow: '0 1px 3px rgba(0,0,0,0.1)',
    deviceType: 'mobile',
  },
};

export const dingtalkTheme: ExtendedPlatformTheme = {
  id: 'dingtalk',
  name: '钉钉',
  ratio: '16:9',
  emojiSet: 'native',
  styles: {
    background: '#f5f5f5',
    bubbleLeftBg: '#ffffff',
    bubbleRightBg: '#d7f0db',
    bubbleLeftColor: '#333333',
    bubbleRightColor: '#333333',
    headerBg: '#1677ff',
    headerColor: '#ffffff',
    fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
    fontSize: 14,
    bubbleRadius: 20,
    bubblePadding: 10,
    avatarSize: 36,
    messageGap: 8,
    timeGap: 300,
    bubbleShadow: '0 2px 4px rgba(0,0,0,0.08)',
    deviceType: 'desktop',
  },
};

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
        showSenderName: false,
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
        showSenderName: false,
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
        customHeader: false,
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
        showSenderName: false,
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
