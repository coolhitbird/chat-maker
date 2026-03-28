// 微信消息组件导出

// 组件
export { default as RedPacket } from './RedPacket';
export { default as Transfer } from './Transfer';
export { default as Voice } from './Voice';
export { default as Image } from './Image';
export { default as Timestamp } from './Timestamp';
export { default as System } from './System';
export { default as File } from './File';

// 样式
export { redPacketStyle, transferStyle } from './styles';
export { defaultRedPacketStyle } from './styles';

// 类型
export type { MessageStyleConfig } from './types';
export type { RedPacketData, TransferData, VoiceData, ImageData, TimestampData, SystemData, FileData } from '@/types';
