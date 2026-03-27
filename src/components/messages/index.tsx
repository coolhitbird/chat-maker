// 消息组件注册中心
// 使用方式：import { MessageComponents, WechatRedPacket } from '@/components/messages'

// ========== 微信消息组件 ==========
import { default as WechatRedPacketComponent } from './wechat/RedPacket';
import { default as WechatTransferComponent } from './wechat/Transfer';
import { default as WechatVoiceComponent } from './wechat/Voice';
import { default as WechatImageComponent } from './wechat/Image';
import { redPacketStyle as wechatRedPacketStyleConfig } from './wechat/styles';
import { transferStyle as wechatTransferStyleConfig } from './wechat/styles';

// ========== 钉钉消息组件 ==========
import { default as DingtalkRedPacketComponent } from './dingtalk/RedPacket';
import { redPacketStyle as dingtalkRedPacketStyleConfig } from './dingtalk/styles';

// ========== WhatsApp消息组件 ==========
import { default as WhatsAppRedPacketComponent } from './whatsapp/RedPacket';
import { redPacketStyle as whatsappRedPacketStyleConfig } from './whatsapp/styles';

// 消息类型
export const MessageTypes = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  VOICE: 'voice',
  REDPACKET: 'redpacket',
  TRANSFER: 'transfer',
  FILE: 'file',
  LINK: 'link',
  LOCATION: 'location',
  CONTACT: 'contact',
  EMOJI: 'emoji',
  STICKER: 'sticker',
} as const;

// 组件集合
export const MessageComponents = {
  wechat: {
    redpacket: WechatRedPacketComponent,
    transfer: WechatTransferComponent,
    voice: WechatVoiceComponent,
    image: WechatImageComponent,
  },
  dingtalk: {
    redpacket: DingtalkRedPacketComponent,
  },
  whatsapp: {
    redpacket: WhatsAppRedPacketComponent,
  },
};

// 方便使用的别名
export const WechatMessages = MessageComponents.wechat;
export const DingtalkMessages = MessageComponents.dingtalk;
export const WhatsAppMessages = MessageComponents.whatsapp;

// 导出所有组件
export {
  WechatRedPacketComponent as WechatRedPacket,
  WechatTransferComponent as WechatTransfer,
  WechatVoiceComponent as WechatVoice,
  WechatImageComponent as WechatImage,
  DingtalkRedPacketComponent as DingtalkRedPacket,
  WhatsAppRedPacketComponent as WhatsAppRedPacket,
};

// 导出样式
export {
  wechatRedPacketStyleConfig as wechatRedPacketStyle,
  wechatTransferStyleConfig as wechatTransferStyle,
  dingtalkRedPacketStyleConfig as dingtalkRedPacketStyle,
  whatsappRedPacketStyleConfig as whatsappRedPacketStyle,
};
