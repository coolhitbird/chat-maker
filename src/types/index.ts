export type MessageType = 'text' | 'image' | 'voice';
export type UserRole = 'user' | 'assistant';
export type VideoRatio = '9:16' | '16:9' | '1:1';
export type EmojiSet = 'native' | 'wechat' | 'qq';

export interface Message {
  id: string;
  role: UserRole;
  sender: string;
  avatar: string;
  content: string;
  type: MessageType;
  timestamp: number;
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
