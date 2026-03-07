const TOKEN_REGEX = /(\{\{[^{}]+\}\}|\{[^{}]+\})/g;
const HTML_LIKE_TAG_REGEX = /<\/?[a-zA-Z][^>]*>/;

export function extractTokens(text: string): string[] {
  const matches = text.match(TOKEN_REGEX);
  if (!matches) {
    return [];
  }

  // Keep stable ordering but dedupe for set-like comparisons.
  return [...new Set(matches)];
}

export function hasHtmlLikeTags(text: string): boolean {
  return HTML_LIKE_TAG_REGEX.test(text);
}

export function hasNewlines(text: string): boolean {
  return text.includes("\n");
}

export function tokensEqual(expected: string[], actual: string[]): boolean {
  if (expected.length !== actual.length) {
    return false;
  }

  const expectedSorted = [...expected].sort();
  const actualSorted = [...actual].sort();

  return expectedSorted.every((token, index) => token === actualSorted[index]);
}
