const COMMON_TWO_CHARS = [
  '我们', '你们', '他们', '这个', '那个', '什么', '怎么', '这样', '那样',
  '这里', '那里', '知道', '可以', '不是', '就是', '还是', '已经', '因为',
  '所以', '如果', '虽然', '但是', '而且', '然后', '之后', '之前', '现在',
  '今天', '明天', '昨天', '时候', '大家', '自己', '觉得', '应该', '可能',
  '需要', '一定', '开始', '进行', '完成', '问题', '方法', '使用', '得到',
  '看到', '听到', '找到', '收到', '说到', '告诉', '请看', '请问', '非常',
  '特别', '真的', '好的', '好的', '不错', '厉害', '谢谢', '不用', '客气',
  '拜拜', '晚安', '早安', '你好', '好的', '好的', '好的', '再见', '好的',
];

const COMMON_THREE_CHARS = [
  '不好意思', '非常感谢', '没关系', '不用谢', '怎么样', '怎么了', '为什么',
  '不知道', '不可以', '有可能', '谢谢你', '辛苦了', '好的好的', '明白了',
  '了解了', '收到收到', '没问题', '不好意思', '打扰一下', '请问一下',
];

function isChineseChar(char: string): boolean {
  return /[\u4e00-\u9fa5]/.test(char);
}

function isEmoji(char: string): boolean {
  return /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(char);
}

export function splitIntoWords(text: string): string[] {
  const words: string[] = [];
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (isEmoji(char)) {
      words.push(char);
      i++;
      continue;
    }

    if (!isChineseChar(char)) {
      words.push(char);
      i++;
      continue;
    }

    let matched = false;

    if (i + 3 < text.length && isChineseChar(text[i + 3])) {
      const fourChar = text.substring(i, i + 4);
      if (Math.random() < 0.3) {
        words.push(fourChar);
        i += 4;
        matched = true;
      }
    }

    if (!matched && i + 2 < text.length && isChineseChar(text[i + 2])) {
      const threeChar = text.substring(i, i + 3);
      const twoChar = text.substring(i, i + 2);

      if (Math.random() < 0.4 && COMMON_THREE_CHARS.includes(threeChar)) {
        words.push(threeChar);
        i += 3;
        matched = true;
      } else if (Math.random() < 0.5) {
        words.push(twoChar);
        i += 2;
        matched = true;
      }
    }

    if (!matched && i + 1 < text.length && isChineseChar(text[i + 1])) {
      const twoChar = text.substring(i, i + 2);
      if (COMMON_TWO_CHARS.includes(twoChar) || Math.random() < 0.6) {
        words.push(twoChar);
        i += 2;
        matched = true;
      }
    }

    if (!matched) {
      words.push(char);
      i++;
    }
  }

  return words;
}

export function isPunctuation(char: string): boolean {
  return /[,，.。!！?？;；:：""''（）\(\)\[\]【】]/.test(char);
}

export function getWordLength(word: string): number {
  let length = 0;
  for (const char of word) {
    if (isEmoji(char)) {
      length += 2;
    } else if (isChineseChar(char)) {
      length += 1;
    } else {
      length += 1;
    }
  }
  return length;
}
