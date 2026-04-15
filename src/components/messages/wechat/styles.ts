import type { MessageStyleConfig } from './types';

// 微信红包样式
export const redPacketStyle: MessageStyleConfig = {
  container: {
    maxWidth: 200,
    minWidth: 200,
    backgroundColor: '#fff',
    borderRadius: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  redPacket: {
    headerBg: 'linear-gradient(135deg, #FFB347 0%, #FF6B6B 100%)',
    bodyBg: '#fff',
    iconColor: '#ffd700',
    titleColor: '#fff',
    amountColor: '#fff',
    footerBg: '#f7f7f7',
    footerColor: '#999',
  },
};

// 微信转账样式
export const transferStyle: MessageStyleConfig = {
  container: {
    maxWidth: 200,
    minWidth: 200,
    backgroundColor: '#fff',
    borderRadius: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  transfer: {
    headerBg: '#e8f5e9',
    bodyBg: '#e8f5e9',
    iconColor: '#07c160',
    titleColor: '#333',
    amountColor: '#333',
    footerBg: '#f7f7f7',
    footerColor: '#999',
  },
};

// 导出默认样式
export const defaultRedPacketStyle = redPacketStyle;
