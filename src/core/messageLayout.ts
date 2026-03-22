export interface MessageLayoutConfig {
  avatarSection: {
    senderName: {
      heightRatio: number;    // 头像高度的百分比，如 0.33 表示 33%
      alignItems: 'flex-start' | 'flex-end';
    };
    bubble: {
      topRatio: number;     // 气泡顶部占头像高度的百分比
      maxWidthRatio: number; // 气泡最大宽度占可用宽度的比例，如 0.9 表示 90%
    };
  };
  bubble: {
    textAlign: 'left' | 'right';
    maxWidth: string;       // CSS 最大宽度，如 '90%'
    paddingTop: number;
    paddingBottom: number;
  };
}

export const defaultLayoutConfig: MessageLayoutConfig = {
  avatarSection: {
    senderName: {
      heightRatio: 0.33,     // 用户名占头像高度的 33%
      alignItems: 'flex-end', // 用户名底部对齐
    },
    bubble: {
      topRatio: 0.4,         // 气泡从头像 40% 处开始
      maxWidthRatio: 0.9,    // 气泡宽度为最大宽度的 90%
    },
  },
  bubble: {
    textAlign: 'left',
    maxWidth: '90%',
    paddingTop: 0,
    paddingBottom: 0,
  },
};

export function getLayoutConfig(isUser: boolean, baseConfig: MessageLayoutConfig = defaultLayoutConfig): MessageLayoutConfig {
  return {
    ...baseConfig,
    bubble: {
      ...baseConfig.bubble,
      textAlign: isUser ? 'right' : 'left',
    },
  };
}
