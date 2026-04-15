export interface ColorScheme {
  name: string;
  background: string;
  bubbleLeftBg: string;
  bubbleRightBg: string;
  bubbleLeftColor: string;
  bubbleRightColor: string;
  headerBg: string;
  headerColor: string;
}

export const wechatGreen: ColorScheme = {
  name: 'wechat-green',
  background: '#EDEDED',       // 微信背景灰
  bubbleLeftBg: '#FFFFFF',     // 对方气泡白
  bubbleRightBg: '#07C160',    // 自己气泡微信绿
  bubbleLeftColor: '#1A1A1A',  // 对方文字近黑
  bubbleRightColor: '#FFFFFF', // 自己文字纯白
  headerBg: '#191919',
  headerColor: '#FFFFFF',
};

export const wechatDesktopGreen: ColorScheme = {
  name: 'wechat-desktop-green',
  background: '#F5F5F5',
  bubbleLeftBg: '#FFFFFF',
  bubbleRightBg: '#07C160',
  bubbleLeftColor: '#1A1A1A',
  bubbleRightColor: '#FFFFFF',
  headerBg: '#2E2E2E',
  headerColor: '#FFFFFF',
};

export const qqBlue: ColorScheme = {
  name: 'qq-blue',
  background: '#e8e8ed',
  bubbleLeftBg: '#ffffff',
  bubbleRightBg: '#b8e864',
  bubbleLeftColor: '#000000',
  bubbleRightColor: '#000000',
  headerBg: '#11b7f4',
  headerColor: '#ffffff',
};

export const dingtalkBlue: ColorScheme = {
  name: 'dingtalk-blue',
  background: '#f5f5f5',
  bubbleLeftBg: '#ffffff',
  bubbleRightBg: '#d7f0db',
  bubbleLeftColor: '#333333',
  bubbleRightColor: '#333333',
  headerBg: '#1677ff',
  headerColor: '#ffffff',
};

export const allColorSchemes: ColorScheme[] = [
  wechatGreen,
  wechatDesktopGreen,
  qqBlue,
  dingtalkBlue,
];

export function getColorSchemeByName(name: string): ColorScheme | undefined {
  return allColorSchemes.find(scheme => scheme.name === name);
}
