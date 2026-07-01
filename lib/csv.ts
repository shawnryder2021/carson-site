// Client-side CSV export — no library. Escapes fields containing commas,
// quotes, or newlines per RFC 4180.

export function toCsv(rows: Record<string, any>[], columns?: string[]): string {
  if (rows.length === 0) return '';
  const cols = columns || Object.keys(rows[0]);
  const esc = (v: any) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))];
  return lines.join('\n');
}

export function downloadCsv(filename: string, rows: Record<string, any>[], columns?: string[]) {
  const csv = toCsv(rows, columns);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
