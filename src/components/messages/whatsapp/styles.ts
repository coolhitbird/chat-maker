import type { MessageStyleConfig } from '@/components/messages/types';

// WhatsApp 红包样式
export const redPacketStyle: MessageStyleConfig = {
  container: {
    maxWidth: 200,
    minWidth: 200,
    backgroundColor: '#fff',
    borderRadius: 8,
    boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
  },
  redPacket: {
    headerBg: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)', // WhatsApp 绿渐变
    bodyBg: '#fff',
    iconColor: '#fff',
    titleColor: '#fff',
    amountColor: '#fff',
    footerBg: '#f0f0f0',
    footerColor: '#667781',
  },
  transfer: {
    headerBg: '#fff',
    bodyBg: '#fff',
    iconColor: '#25d366',
    titleColor: '#333',
    amountColor: '#25d366',
    footerBg: '#f0f0f0',
    footerColor: '#667781',
  },
};

// 导出默认样式
export const defaultRedPacketStyle = redPacketStyle;
