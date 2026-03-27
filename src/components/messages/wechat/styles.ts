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
    headerBg: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
    bodyBg: '#fff',
    iconColor: '#ffd700',
    titleColor: '#fff',
    amountColor: '#fff',
    footerBg: '#f8f8f8',
    footerColor: '#666',
  },
  transfer: {
    headerBg: '#fff',
    bodyBg: '#fff',
    iconColor: '#07c160',
    titleColor: '#333',
    amountColor: '#07c160',
    footerBg: '#f8f8f8',
    footerColor: '#666',
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
    headerBg: '#f5f5f5', // 灰色背景
    bodyBg: '#f5f5f5',
    iconColor: '#07c160', // 微信绿
    titleColor: '#333', // 深色文字
    amountColor: '#333', // 深色金额
    footerBg: '#f8f8f8',
    footerColor: '#999', // 灰色文字
  },
};

// 导出默认样式
export const defaultRedPacketStyle = redPacketStyle;
