// 钉钉消息组件注册中心
// 预留：以后扩展钉钉特有的消息类型

// 钉钉消息类型
export const DingtalkMessageTypes = {
  REDPACKET: 'redpacket',
  TRANSFER: 'transfer',
  VOICE: 'voice',
  VIDEO: 'video',
  LOCATION: 'location',
  LINK: 'link',
  FILE: 'file',
  TASK: 'task',
  CALENDAR: 'calendar',
} as const;

// 钉钉红包组件（预留）
export { default as RedPacket } from './RedPacket';

// 钉钉样式配置（预留）
export const dingtalkStyles = {
  // 钉钉特有样式
};
