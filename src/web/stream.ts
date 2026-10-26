// Reads text out of a JSON answer that is still arriving, so the generating
// screen can show the sentences as they are written.

/** The value of a string key, as far as it has arrived. */
function partialString(raw: string, from: number): { text: string; end: number } {
  let out = '';
  let i = from;
  for (; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '\\') {
      const n = raw[i + 1];
      if (n === undefined) break;
      out += n === 'n' ? '\n' : n === 't' ? '\t' : n === 'u' ? '' : n;
      i += n === 'u' ? 5 : 1;
    } else if (ch === '"') return { text: out, end: i };
    else out += ch;
  }
  return { text: out, end: -1 };
}

/** Every "text" and "short" string in order of appearance, finished or not. */
export function sentencesSoFar(raw: string): string[] {
  const out: string[] = [];
  const re = /"(short|text)"\s*:\s*"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const { text, end } = partialString(raw, m.index + m[0].length);
    if (text) out.push(text);
    if (end < 0) break;
    re.lastIndex = end + 1;
  }
  return out;
}

export const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
