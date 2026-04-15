import type { QuoteData } from '@/types';

const FILE_QUOTE_RE = /^\[文件\s*([\s\S]+?)\]$/;

export function getQuoteLabel(quote?: QuoteData): string {
  if (!quote) return '';
  const match = quote.content.match(FILE_QUOTE_RE);
  if (!match) return quote.content;
  return `[文件 ${match[1]}]`;
}

function truncateTextForCanvas(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(`${truncated}...`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated.length > 0 ? `${truncated}...` : text.slice(0, 1);
}

export function getQuoteSummaryForCanvas(
  quote: QuoteData,
  ctx: CanvasRenderingContext2D,
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
): string {
  const content = getQuoteLabel(quote);
  ctx.font = `${Math.round(fontSize)}px "${fontFamily.replace(/"/g, '')}"`;
  if (ctx.measureText(content).width <= maxWidth) return content;

  if (quote.type !== 'file') {
    return truncateTextForCanvas(ctx, content, maxWidth);
  }

  const match = content.match(FILE_QUOTE_RE);
  if (!match) return truncateTextForCanvas(ctx, content, maxWidth);

  const fileName = match[1];
  const extIndex = fileName.lastIndexOf('.');
  const ext = extIndex >= 0 ? fileName.slice(extIndex) : '';
  let baseName = extIndex >= 0 ? fileName.slice(0, extIndex) : fileName;
  let candidate = `[文件 ${baseName}${ext}]`;
  if (ctx.measureText(candidate).width <= maxWidth) return candidate;

  while (baseName.length > 0) {
    const next = `[文件 ${baseName}...${ext}]`;
    if (ctx.measureText(next).width <= maxWidth) return next;
    baseName = baseName.slice(0, -1);
  }

  let fallback = `[文件 ...${ext}]`;
  while (fallback.length > 1 && ctx.measureText(fallback).width > maxWidth) {
    fallback = fallback.slice(0, -1);
  }

  return fallback;
}

function truncateTextForDOM(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

export function getQuoteSummaryForDOM(quote: QuoteData, maxLength: number = 50): string {
  const content = getQuoteLabel(quote);
  if (content.length <= maxLength) return content;

  if (quote.type !== 'file') {
    return truncateTextForDOM(content, maxLength);
  }

  const match = content.match(FILE_QUOTE_RE);
  if (!match) return truncateTextForDOM(content, maxLength);

  const fileName = match[1];
  const extIndex = fileName.lastIndexOf('.');
  const ext = extIndex >= 0 ? fileName.slice(extIndex) : '';
  let baseName = extIndex >= 0 ? fileName.slice(0, extIndex) : fileName;
  let candidate = `[文件 ${baseName}${ext}]`;
  if (candidate.length <= maxLength) return candidate;

  while (baseName.length > 0) {
    const next = `[文件 ${baseName}...${ext}]`;
    if (next.length <= maxLength) return next;
    baseName = baseName.slice(0, -1);
  }

  let fallback = `[文件 ...${ext}]`;
  while (fallback.length > maxLength) {
    fallback = fallback.slice(0, -1);
  }

  return fallback;
}

