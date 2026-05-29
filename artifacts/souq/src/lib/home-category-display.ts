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

/** Home strip only — hide disposable staging test categories from display (no DB change). */
export function filterHomeCategories<T extends { name?: string | null }>(
  categories: T[] | undefined | null,
): T[] | undefined {
  if (!Array.isArray(categories)) return categories ?? undefined;
  return categories.filter((cat) => !isHomeTestCategory(cat));
}

function isHomeTestCategory(cat: { name?: string | null }): boolean {
  const name = (cat.name ?? "").trim().toLowerCase();
  if (!name) return false;
  if (name === "test cat 1777565550") return true;
  if (/^test cat\s+\d{10,}$/.test(name)) return true;
  return false;
}
