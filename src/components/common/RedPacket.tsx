import React from 'react';
import type { RedPacketData } from '@/types';

interface RedPacketProps {
  data: RedPacketData;
  isUser: boolean;
  scale?: number;
}

export default function RedPacket({ data, isUser: _isUser, scale = 1 }: RedPacketProps) {
  const { amount, greeting, isOpened } = data;
  
  // 外层容器
  const containerStyle: React.CSSProperties = {
    width: 200 * scale,
    borderRadius: 10 * scale,
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  };

  // 主体区域（橙红色渐变）
  const bodyStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #FFB347 0%, #FF6B6B 100%)',
    padding: `${12 * scale}px`,
    display: 'flex',
    alignItems: 'center',
    gap: 12 * scale,
  };

  // 钱袋图标（黄色圆形）
  const iconStyle: React.CSSProperties = {
    width: 48 * scale,
    height: 48 * scale,
    borderRadius: '50%',
    background: '#FFD700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24 * scale,
    flexShrink: 0,
  };

  // 右侧内容区
  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'hidden',
  };

  // 标题样式
  const titleStyle: React.CSSProperties = {
    color: '#fff',
    fontSize: 16 * scale,
    fontWeight: 'bold',
    lineHeight: 1.3,
  };

  // 祝福语样式
  const greetingStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12 * scale,
    lineHeight: 1.4,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginTop: 4 * scale,
  };

  // 底部状态栏（白色背景）
  const footerStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.95)',
    padding: `${8 * scale}px ${12 * scale}px`,
    borderTop: '1px solid rgba(0,0,0,0.05)',
  };

  // 状态文字样式
  const statusStyle: React.CSSProperties = {
    fontSize: 11 * scale,
    color: '#999',
  };

  return (
    <div style={containerStyle}>
      {/* 主体区域 */}
      <div style={bodyStyle}>
        {/* 钱袋图标 */}
        <div style={iconStyle}>
          🧧
        </div>
        
        {/* 右侧内容 */}
        <div style={contentStyle}>
          <div style={titleStyle}>红包</div>
          <div style={greetingStyle}>
            {greeting || '恭喜发财，大吉大利'}
          </div>
        </div>
      </div>

      {/* 底部状态 */}
      <div style={footerStyle}>
        <div style={statusStyle}>
          {isOpened ? `已领取 ¥${(amount / 100).toFixed(2)}` : '领取红包'}
        </div>
      </div>
    </div>
  );
}
