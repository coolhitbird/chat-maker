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
  background: '#e8e8e8',
  bubbleLeftBg: '#ffffff',
  bubbleRightBg: '#9fea58',
  bubbleLeftColor: '#192020',
  bubbleRightColor: '#192020',
  headerBg: '#191919',
  headerColor: '#ffffff',
};

export const wechatDesktopGreen: ColorScheme = {
  name: 'wechat-desktop-green',
  background: '#f5f5f5',
  bubbleLeftBg: '#ffffff',
  bubbleRightBg: '#95ec69',
  bubbleLeftColor: '#333333',
  bubbleRightColor: '#333333',
  headerBg: '#2e2e2e',
  headerColor: '#ffffff',
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
