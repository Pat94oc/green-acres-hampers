'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DeleteOrderButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function remove() {
    const confirmed = window.confirm('Delete this order permanently? This can only be done before production has been logged and before a signed docket exists.');
    if (!confirmed) return;
    setLoading(true);
    setError('');
    const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || 'Could not delete order');
      return;
    }
    router.push('/orders');
    router.refresh();
  }

  return <div className="action-stack">
    <button className="danger-button" onClick={remove} disabled={loading}>{loading ? 'Deleting…' : 'Delete Order'}</button>
    {error && <span className="inline-error">{error}</span>}
  </div>;
}
