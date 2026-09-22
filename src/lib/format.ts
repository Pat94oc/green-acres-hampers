export function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
}

export function methodLabel(value: string) {
  if (value === 'green_acres') return 'GA Delivery';
  if (value === 'dpd') return 'DPD';
  return 'Collection';
}

export function statusLabel(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
