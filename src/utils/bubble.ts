export interface BubbleStyle {
  backgroundColor: string;
  borderRadius: number;
  tailDirection: 'left' | 'right' | 'none';
  tailSize?: number;
}

export function createBubbleSvg(style: BubbleStyle): string {
  const { backgroundColor, borderRadius, tailDirection, tailSize = 8 } = style;
  
  if (tailDirection === 'none') {
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1" height="1">
        <rect width="1" height="1" fill="${backgroundColor}" rx="${borderRadius}" ry="${borderRadius}"/>
      </svg>
    `)}`;
  }

  const isRight = tailDirection === 'right';
  const size = 100;
  const tailOffset = 15;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + tailSize}">
      <defs>
        <clipPath id="bubbleClip">
          ${isRight 
            ? `<path d="M0,0 H${size - tailOffset} Q${size},0 ${size},${tailOffset} V${size - borderRadius} Q${size},${size} ${size - borderRadius},${size} H${borderRadius} Q0,${size} 0,${size - borderRadius} V${borderRadius} Q0,0 ${borderRadius},0 Z"/>`
            : `<path d="M${tailOffset},0 H${size} Q${size},0 ${size},${borderRadius} V${size - borderRadius} Q${size},${size} ${size - borderRadius},${size} H${borderRadius} Q0,${size} 0,${size - borderRadius} V${tailOffset} Q0,0 ${tailOffset},0 Z"/>`
          }
        </clipPath>
      </defs>
      <rect width="${size}" height="${size}" fill="${backgroundColor}" rx="${borderRadius}" ry="${borderRadius}"/>
      ${isRight 
        ? `<polygon points="${size - tailOffset},${size} ${size - tailOffset + tailSize},${size + tailSize} ${size - tailOffset - tailSize},${size}" fill="${backgroundColor}"/>`
        : `<polygon points="${tailOffset},${size} ${tailOffset - tailSize},${size + tailSize} ${tailOffset + tailSize},${size}" fill="${backgroundColor}"/>`
      }
    </svg>
  `;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function createWechatBubble(isUser: boolean, backgroundColor: string): string {
  const tailDirection = isUser ? 'right' : 'left';
  return createBubbleSvg({
    backgroundColor,
    borderRadius: 10,
    tailDirection,
    tailSize: 6,
  });
}
