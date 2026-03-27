// 消息类型
export type MessageType = 'text' | 'redpacket' | 'transfer' | 'voice' | 'image';
export type UserRole = 'user' | 'assistant';
export type VideoRatio = '9:16' | '16:9' | '1:1';
export type EmojiSet = 'native' | 'wechat' | 'qq';

export interface RedPacketData {
  amount: number; // 红包金额（分）
  greeting: string; // 祝福语
  sender: string; // 发送者
  receiver?: string; // 接收者
  isOpened: boolean; // 是否已打开
}

export interface TransferData {
  amount: number; // 转账金额（分）
  note?: string; // 转账说明
  isReceived: boolean; // 是否已收款
  sender: string; // 发送者
}

export interface VoiceData {
  duration: number; // 时长（秒）
  isPlaying?: boolean; // 是否正在播放
  text?: string; // 转文字内容（可选）
}

export interface ImageData {
  url: string; // 图片URL
  width?: number; // 图片宽度
  height?: number; // 图片高度
  caption?: string; // 图片说明
}

export interface Message {
  id: string;
  role: UserRole;
  sender: string;
  avatar: string;
  content: string;
  type: MessageType;
  timestamp: number;
  // 扩展数据（根据消息类型不同）
  redPacket?: RedPacketData;
  transfer?: TransferData;
  voice?: VoiceData;
  image?: ImageData;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  role: UserRole;
}

export interface ThemeStyles {
  background: string;
  bubbleLeftBg: string;
  bubbleRightBg: string;
  bubbleLeftColor: string;
  bubbleRightColor: string;
  headerBg: string;
  headerColor: string;
  fontFamily: string;
  fontSize: number;
  bubbleRadius: number;
  bubblePadding: number;
  avatarSize: number;
  messageGap: number;
  timeGap: number;
  bubbleShadow?: string;
  bubbleLeftBorder?: string;
  bubbleRightBorder?: string;
  inputBg?: string;
  statusBarColor?: string;
}

export interface PlatformTheme {
  id: string;
  name: string;
  ratio: VideoRatio;
  emojiSet: EmojiSet;
  styles: ThemeStyles;
}

export interface ExportSettings {
  width: number;
  height: number;
  fps: number;
  videoBitrate: number;
  typingSpeed: number;
  messageInterval: number;
  scrollEnabled: boolean;
}

export interface ChatProject {
  id: string;
  name: string;
  chatTitle: string;
  platform: PlatformTheme;
  users: UserProfile[];
  messages: Message[];
  settings: ExportSettings;
}

export interface ParseOptions {
  mergeConsecutive: boolean;
  autoAssignRoles: boolean;
  matchByName: boolean;
  preserveEmoji: boolean;
}

export interface WechatEmoji {
  key: string;
  name: string;
  url: string;
}
