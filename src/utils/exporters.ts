export function exportCSV(rows: Array<Record<string, any>>, filename: string) {
  if (!rows?.length) return;
  const headerSet = new Set<string>();
  for (const r of rows) {
    Object.keys(r ?? {}).forEach((k) => headerSet.add(k));
  }
  const headers = Array.from(headerSet);
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
