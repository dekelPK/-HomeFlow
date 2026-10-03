const nf = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });

export function ils(n: number): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}₪${nf.format(Math.abs(Math.round(n)))}`;
}

export function parseAmount(raw: string): number | null {
  const clean = raw.replace(/[^\d.]/g, '');
  if (clean === '') return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}
