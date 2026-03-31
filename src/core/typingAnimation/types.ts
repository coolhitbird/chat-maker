export interface TypingEvent {
  type: 'char' | 'emoji' | 'backspace' | 'pause' | 'paste-flash';
  content?: string;
  emojiUrl?: string;
  duration: number;
  timestamp: number;
  effect?: 'normal' | 'pop' | 'sparkle' | 'flash' | 'expand';
}

export interface MessageTypingSequence {
  messageId: string;
  events: TypingEvent[];
  totalDuration: number;
  visibleText: string;
}

export type RenderMode = 'simple' | 'loop' | 'content' | 'dom';

export interface TypingAnimationConfig {
  enabled: boolean;
  renderMode: RenderMode;
  baseSpeed: number;
  speedVariance: number;
  charChance: number;
  wordChance: number;
  pasteChance: number;
  pasteMinLength: number;
  pasteMaxLength: number;
  pasteAnimation: 'flash' | 'expand';
  pauseEnabled: boolean;
  pauseProbability: number;
  pauseMinDuration: number;
  pauseMaxDuration: number;
  typoEnabled: boolean;
  typoProbability: number;
  typoDeleteStyle: 'cursor' | 'instant';
  emojiEnabled: boolean;
  emojiEffect: 'pop' | 'sparkle' | 'none';
  cursorEnabled: boolean;
  cursorBlinkRate: number;
  fastMode: boolean;
  targetDuration: number;
}

export interface MessageTypingState {
  messageId: string;
  typedChars: number;
  totalChars: number;
  isTyping: boolean;
  showCursor: boolean;
}

export interface ExportConfig {
  fps: number;
  width: number;
  height: number;
  styles?: {
    fontFamily?: string;
    fontSize?: number;
    avatarSize?: number;
    bubblePadding?: number;
    bubbleRadius?: number;
    bubbleLeftBg?: string;
    bubbleRightBg?: string;
    bubbleLeftColor?: string;
    bubbleRightColor?: string;
    background?: string;
    headerBg?: string;
    headerColor?: string;
  };
}

export const DEFAULT_EXPORT_STYLES = {
  fontFamily: 'Microsoft YaHei, PingFang SC, sans-serif',
  fontSize: 16,
  avatarSize: 40,
  bubblePadding: 12,
  bubbleRadius: 18,
  bubbleLeftBg: '#ffffff',
  bubbleRightBg: '#95ec69',
  bubbleLeftColor: '#1a1a1a',
  bubbleRightColor: '#1a1a1a',
  background: '#f5f5f5',
  headerBg: '#f5f5f5',
  headerColor: '#1a1a1a',
};

export interface TypingRenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  darkMode: boolean;
}

export interface FrameData {
  canvas: HTMLCanvasElement;
  timestamp: number;
}
