// WhatsApp消息组件注册中心
// 预留：以后扩展WhatsApp特有的消息类型

// 导入组件
export { default as RedPacket } from './RedPacket';

// WhatsApp消息类型
export const WhatsappMessageTypes = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document',
  LOCATION: 'location',
  CONTACT: 'contact',
  STICKER: 'sticker',
} as const;

// WhatsApp样式配置
export { redPacketStyle } from './styles';
