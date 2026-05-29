/** Split compound category labels into two balanced lines (no ellipsis). */
export function splitHomeCategoryLabel(label: string): readonly [string] | readonly [string, string] {
  const trimmed = label.trim();
  if (!trimmed) return [""];

  const arBreaks: number[] = [];
  for (let i = 0; i < trimmed.length; ) {
    const idx = trimmed.indexOf(" و", i);
    if (idx === -1) break;
    arBreaks.push(idx);
    i = idx + 1;
  }
  if (arBreaks.length > 0) {
    const splitAt = arBreaks[0]!;
    return [trimmed.slice(0, splitAt), trimmed.slice(splitAt + 1)];
  }

  const enBreaks: number[] = [];
  for (let i = 0; i < trimmed.length; ) {
    const idx = trimmed.indexOf(" & ", i);
    if (idx === -1) break;
    enBreaks.push(idx);
    i = idx + 1;
  }
  if (enBreaks.length > 0) {
    const splitAt = enBreaks[0]!;
    return [trimmed.slice(0, splitAt), trimmed.slice(splitAt + 1)];
  }

  return [trimmed];
}
