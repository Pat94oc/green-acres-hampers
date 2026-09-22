export function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat('en-IE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function methodLabel(value: string) {
  if (value === 'green_acres') return 'GA Delivery';
  if (value === 'dpd') return 'DPD';
  return 'Collection';
}

export function statusLabel(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
