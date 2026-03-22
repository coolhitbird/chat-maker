import { useRef, useEffect, useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import MessageContent from '@/components/common/MessageContent';
import { getPlatformConfig } from '@/themes/wechat';
import type { Message } from '@/types';
import { generateAvatar } from '@/utils/avatar';
import { defaultLayoutConfig } from '@/core/messageLayout';

interface ChatContainerProps {
  messages: Message[];
  scale?: number;
}

export default function ChatContainer({ 
  messages, 
  scale = 0.4 
}: ChatContainerProps) {
  const { project } = useChatStore();
  const { platform, chatTitle } = project;
  const { styles } = platform;
  const config = getPlatformConfig(platform.id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const urls: Record<string, string> = {};
    const userAvatarMap = new Map(project.users.map(u => [u.name, u.avatar]));
    messages.forEach(msg => {
      if (!urls[msg.sender]) {
        urls[msg.sender] = userAvatarMap.get(msg.sender) || msg.avatar || generateAvatar(msg.sender);
      }
    });
    setAvatarUrls(urls);
  }, [messages, project.users]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const isMobile = config.deviceType === 'mobile';
  
  // 根据 scale 计算所有尺寸，字号最小为10px
  const minFontSize = 10;
  const effectiveScale = Math.max(scale, minFontSize / styles.fontSize);
  const scaledFontSize = Math.max(minFontSize, Math.round(styles.fontSize * effectiveScale));
  const scaledAvatarSize = Math.round(styles.avatarSize * effectiveScale);
  const scaledPaddingH = Math.round(styles.bubblePadding * effectiveScale);
  const scaledPaddingV = Math.round(styles.bubblePadding * effectiveScale);
  const scaledGap = Math.round(styles.messageGap * effectiveScale);
  const scaledHeaderHeight = Math.round((isMobile ? 50 : 40) * effectiveScale);
  const scaledBubbleRadius = Math.max(4, Math.round(styles.bubbleRadius * effectiveScale));

  const getBubbleStyle = (isUser: boolean): React.CSSProperties => {
    const baseBg = isUser ? styles.bubbleRightBg : styles.bubbleLeftBg;
    const baseColor = isUser ? styles.bubbleRightColor : styles.bubbleLeftColor;
    
    const borderRadius = `${scaledBubbleRadius}px`;

    return {
      backgroundColor: baseBg,
      color: baseColor,
      borderRadius,
      padding: `${scaledPaddingV}px ${scaledPaddingH}px`,
      fontSize: scaledFontSize,
      fontFamily: styles.fontFamily,
      wordBreak: 'break-word',
      lineHeight: 1.4,
      display: 'inline-block',
      textAlign: 'left',
    };
  };

  const renderStatusBar = () => {
    if (!isMobile) return null;
    
    const statusBarHeight = 24 * effectiveScale;
    const iconSize = Math.max(10, 12 * effectiveScale);
    const fontSize = Math.max(9, 10 * effectiveScale);
    
    return (
      <div style={{
        height: statusBarHeight,
        backgroundColor: styles.headerBg,
        color: styles.headerColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 8 * effectiveScale,
        paddingRight: 8 * effectiveScale,
        fontSize,
        fontFamily: styles.fontFamily,
      }}>
        {/* 左侧时间 */}
        <div style={{ fontWeight: 500 }}>10:30</div>
        
        {/* 右侧状态图标 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 * effectiveScale }}>
          {/* 信号图标 */}
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor">
            <rect x="1" y="16" width="4" height="6" rx="1" />
            <rect x="7" y="12" width="4" height="10" rx="1" />
            <rect x="13" y="8" width="4" height="14" rx="1" />
            <rect x="19" y="4" width="4" height="18" rx="1" />
          </svg>
          
          {/* WiFi图标 */}
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor">
            <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
          </svg>
          
          {/* 电量图标 */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: iconSize * 1.5,
              height: iconSize,
              border: `1px solid ${styles.headerColor}`,
              borderRadius: 2,
              padding: 1,
              display: 'flex',
              alignItems: 'center',
            }}>
              <div style={{
                width: '75%',
                height: '100%',
                backgroundColor: styles.headerColor,
                borderRadius: 1,
              }} />
            </div>
            <div style={{
              width: 2,
              height: iconSize * 0.5,
              backgroundColor: styles.headerColor,
              borderRadius: 1,
              marginLeft: 1,
            }} />
          </div>
        </div>
      </div>
    );
  };

  const renderHeader = () => {
    if (!config.customHeader) return null;

    const headerStyle: React.CSSProperties = {
      height: scaledHeaderHeight,
      backgroundColor: styles.headerBg,
      color: styles.headerColor,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: scaledFontSize,
      fontFamily: styles.fontFamily,
      fontWeight: 500,
    };

    if (isMobile) {
      return (
        <>
          {renderStatusBar()}
          <div style={headerStyle}>
            <span style={{ fontWeight: 600 }}>{platform.name}</span>
          </div>
          {chatTitle && (
            <div style={{
              height: scaledHeaderHeight * 0.8,
              backgroundColor: styles.headerBg,
              color: styles.headerColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: Math.max(10, scaledFontSize * 0.85),
              fontFamily: styles.fontFamily,
              fontWeight: 400,
              borderBottom: `1px solid rgba(255,255,255,0.1)`,
            }}>
              {chatTitle}
            </div>
          )}
        </>
      );
    }

    return (
      <>
        <div style={headerStyle}>{platform.name}</div>
        {chatTitle && (
          <div style={{
            height: scaledHeaderHeight * 0.8,
            backgroundColor: styles.headerBg,
            color: styles.headerColor,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 12 * effectiveScale,
            fontSize: Math.max(10, scaledFontSize * 0.85),
            fontFamily: styles.fontFamily,
            fontWeight: 400,
            opacity: 0.85,
          }}>
            {chatTitle}
          </div>
        )}
      </>
    );
  };

  const renderAvatar = (msg: Message) => {
    const avatarUrl = avatarUrls[msg.sender] || msg.avatar || generateAvatar(msg.sender);
    
    return (
      <img 
        src={avatarUrl}
        alt={msg.sender}
        style={{
          width: scaledAvatarSize,
          height: scaledAvatarSize,
          borderRadius: platform.id === 'qq' ? `${scaledBubbleRadius}px` : '50%',
          flexShrink: 0,
          objectFit: 'cover',
        }}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = generateAvatar(msg.sender);
        }}
      />
    );
  };

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    backgroundColor: styles.background,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: styles.fontFamily,
  };

  let bodyStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: scaledGap,
    backgroundColor: styles.background,
  };

  if (platform.id === 'qq' && config.backgroundPattern) {
    bodyStyle = {
      ...bodyStyle,
      backgroundImage: 'radial-gradient(circle, #c8c8c8 1px, transparent 1px)',
      backgroundSize: `${16 * effectiveScale}px ${16 * effectiveScale}px`,
    };
  }

  // 电脑端：窗口样式
  if (!isMobile) {
    return (
      <div style={{
        ...containerStyle,
        alignItems: 'center',
        justifyContent: 'center',
        padding: scaledGap,
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#ffffff',
          borderRadius: 8 * effectiveScale,
          boxShadow: `0 4px 20px rgba(0,0,0,0.15)`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* 窗口标题栏 - 平台名称 */}
          <div style={{
            height: scaledHeaderHeight,
            backgroundColor: styles.headerBg,
            color: styles.headerColor,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 12 * effectiveScale,
            fontSize: scaledFontSize,
            fontFamily: styles.fontFamily,
            gap: 8 * effectiveScale,
          }}>
            <div style={{ display: 'flex', gap: 4 * effectiveScale }}>
              <div style={{ width: 8 * effectiveScale, height: 8 * effectiveScale, borderRadius: '50%', backgroundColor: '#ff5f56' }} />
              <div style={{ width: 8 * effectiveScale, height: 8 * effectiveScale, borderRadius: '50%', backgroundColor: '#ffbd2e' }} />
              <div style={{ width: 8 * effectiveScale, height: 8 * effectiveScale, borderRadius: '50%', backgroundColor: '#27ca40' }} />
            </div>
            <span style={{ marginLeft: 8 * effectiveScale, fontWeight: 500 }}>{platform.name}</span>
          </div>
          {/* 聊天标题栏 */}
          {chatTitle && (
            <div style={{
              height: scaledHeaderHeight * 0.8,
              backgroundColor: styles.headerBg,
              color: styles.headerColor,
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 12 * effectiveScale,
              fontSize: Math.max(10, scaledFontSize * 0.85),
              fontFamily: styles.fontFamily,
              fontWeight: 400,
              opacity: 0.85,
              borderTop: `1px solid rgba(255,255,255,0.1)`,
            }}>
              {chatTitle}
            </div>
          )}
          <div ref={scrollRef} style={bodyStyle}>
            {messages.length === 0 ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#999',
                fontSize: scaledFontSize,
              }}>
                暂无消息
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === 'user';
                const senderHeight = scaledAvatarSize * defaultLayoutConfig.avatarSection.senderName.heightRatio;

                return (
                  <div key={msg.id} style={{
                    display: 'flex',
                    flexDirection: isUser ? 'row-reverse' : 'row',
                    gap: scaledGap,
                    marginBottom: scaledGap,
                    minHeight: scaledAvatarSize,
                  }}>
                    <img 
                      src={avatarUrls[msg.sender] || msg.avatar || generateAvatar(msg.sender)}
                      alt={msg.sender}
                      style={{
                        width: scaledAvatarSize,
                        height: scaledAvatarSize,
                        borderRadius: '50%',
                        flexShrink: 0,
                        objectFit: 'cover',
                      }}
                    />
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                    }}>
                      {config.showSenderName && (
                        <div style={{
                          fontSize: scaledFontSize * 0.7,
                          color: '#888',
                          height: senderHeight,
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: isUser ? 'flex-end' : 'flex-start',
                        }}>
                          {msg.sender}
                        </div>
                      )}
                      <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: isUser ? 'flex-end' : 'flex-start',
                      }}>
                        <div style={{
                          ...getBubbleStyle(isUser),
                          maxWidth: '100%',
                        }}>
                          {msg.content ? (
                            <MessageContent content={msg.content} />
                          ) : (
                            <span>&nbsp;</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // 手机端
  return (
    <div style={containerStyle}>
      {renderHeader()}
      <div ref={scrollRef} style={bodyStyle}>
        {messages.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#999',
            fontSize: scaledFontSize,
          }}>
            暂无消息
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            const senderHeight = scaledAvatarSize * defaultLayoutConfig.avatarSection.senderName.heightRatio;

            return (
              <div key={msg.id} style={{
                display: 'flex',
                flexDirection: isUser ? 'row-reverse' : 'row',
                gap: scaledGap,
                marginBottom: scaledGap,
                minHeight: scaledAvatarSize,
              }}>
                {renderAvatar(msg)}
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  {config.showSenderName && (
                    <div style={{
                      fontSize: scaledFontSize * 0.7,
                      color: '#888',
                      height: senderHeight,
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: isUser ? 'flex-end' : 'flex-start',
                    }}>
                      {msg.sender}
                    </div>
                  )}
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                  }}>
                    <div style={{
                      ...getBubbleStyle(isUser),
                      maxWidth: '100%',
                    }}>
                      {msg.content ? (
                        <MessageContent content={msg.content} />
                      ) : (
                        <span>&nbsp;</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
