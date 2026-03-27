// 红包数据结构
export interface RedPacketData {
  amount: number; // 金额（分）
  greeting: string; // 祝福语
  isOpened?: boolean; // 是否已打开
}

// 转账数据结构
export interface TransferData {
  amount: number; // 金额（分）
  note?: string; // 转账说明
  isReceived: boolean; // 是否已收款
  sender: string; // 发送者
}

// 语音数据结构
export interface VoiceData {
  duration: number; // 时长（秒）
  isPlaying?: boolean; // 是否正在播放
  waveform?: number[]; // 波形数据（可选）
  text?: string; // 转文字内容（可选）
}

// 图片数据结构
export interface ImageData {
  url: string; // 图片URL
  width?: number; // 图片宽度
  height?: number; // 图片高度
  caption?: string; // 图片说明
}

// 组件样式配置接口
export interface MessageStyleConfig {
  // 外层容器样式
  container?: {
    width?: number;
    maxWidth?: number;
    minWidth?: number;
    backgroundColor?: string;
    borderRadius?: number;
    boxShadow?: string;
  };
  
  // 主体区域
  body?: {
    background?: string;
    padding?: number;
  };
  
  // 图标
  icon?: {
    size?: number;
    background?: string;
    borderRadius?: string;
  };
  
  // 标题
  title?: {
    fontSize?: number;
    fontWeight?: string;
    color?: string;
  };
  
  // 内容
  content?: {
    fontSize?: number;
    color?: string;
  };
  
  // 底部状态
  footer?: {
    height?: number;
    background?: string;
    fontSize?: number;
    color?: string;
  };
  
  // 微信特有样式
  redPacket?: {
    headerBg?: string;
    bodyBg?: string;
    iconColor?: string;
    titleColor?: string;
    amountColor?: string;
    footerBg?: string;
    footerColor?: string;
  };
  transfer?: {
    headerBg?: string;
    bodyBg?: string;
    iconColor?: string;
    titleColor?: string;
    amountColor?: string;
    footerBg?: string;
    footerColor?: string;
    contentColor?: string;
  };
}

// 红包组件 Props
export interface RedPacketComponentProps {
  data: RedPacketData;
  isUser?: boolean;
  style?: MessageStyleConfig;
  scale?: number;
}

// 转账组件 Props
export interface TransferComponentProps {
  data: TransferData;
  isUser?: boolean;
  style?: MessageStyleConfig;
  scale?: number;
}

// 语音组件 Props
export interface VoiceComponentProps {
  data: VoiceData;
  isUser?: boolean;
  scale?: number;
}

// 图片组件 Props
export interface ImageComponentProps {
  data: ImageData;
  isUser?: boolean;
  scale?: number;
}
