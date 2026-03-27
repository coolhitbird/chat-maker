import type { MessageStyleConfig } from '@/components/messages/types';

// 钉钉红包样式
export const redPacketStyle: MessageStyleConfig = {
  container: {
    maxWidth: 200,
    minWidth: 200,
    backgroundColor: '#fff',
    borderRadius: 8,
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
  },
  redPacket: {
    headerBg: 'linear-gradient(135deg, #3370ff 0%, #0052d9 100%)', // 钉钉蓝渐变
    bodyBg: '#fff',
    iconColor: '#ffd700',
    titleColor: '#fff',
    amountColor: '#fff',
    footerBg: '#f8f8f8',
    footerColor: '#333',
  },
  transfer: {
    headerBg: '#fff',
    bodyBg: '#fff',
    iconColor: '#3370ff',
    titleColor: '#333',
    amountColor: '#3370ff',
    footerBg: '#f8f8f8',
    footerColor: '#333',
  },
};

// 导出默认样式
export const defaultRedPacketStyle = redPacketStyle;
