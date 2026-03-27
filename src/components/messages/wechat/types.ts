// 微信消息样式配置接口
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
