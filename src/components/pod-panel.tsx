'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Pod = {
  id: string;
  display_filename: string;
  signed_by: string | null;
  pod_date: string | null;
  created_at: string;
};

async function authHeaders() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Your login session has expired. Please sign in again.');
  return {
    Authorization: `Bearer ${session.access_token}`,
    apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  };
}

export function PodPanel({ orderId, pods, allowUpload }: { orderId: string; pods: Pod[]; allowUpload: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [signedBy, setSignedBy] = useState('');
  const [podDate, setPodDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  async function upload() {
    if (!file) {
      setError('Choose a scanned POD first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const headers = await authHeaders();
      const form = new FormData();
      form.set('orderId', orderId);
      form.set('file', file);
      form.set('signedBy', signedBy);
      form.set('podDate', podDate);
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/hamper-pod`, {
        method: 'POST',
        headers,
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not upload POD');
      setFile(null);
      setSignedBy('');
      setPodDate('');
      const input = document.getElementById('pod-file') as HTMLInputElement | null;
      if (input) input.value = '';
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload POD');
    } finally {
      setLoading(false);
    }
  }

  async function openPod(podId: string) {
    setOpeningId(podId);
    setError('');
    try {
      const headers = await authHeaders();
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/hamper-pod?podId=${encodeURIComponent(podId)}`, { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not open POD');
      window.open(json.url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open POD');
    } finally {
      setOpeningId(null);
    }
  }

  return <div className="card pod-card">
    <div className="section-row"><div><h2>Proof of Delivery</h2><p className="muted">Signed delivery dockets are stored privately against this order.</p></div><span className="pill">{pods.length} POD{pods.length === 1 ? '' : 's'}</span></div>

    {pods.length > 0 && <div className="pod-list">{pods.map((pod) => <div className="pod-row" key={pod.id}>
      <div><strong>{pod.display_filename}</strong><div className="muted pod-meta">{pod.pod_date ? `POD date: ${pod.pod_date}` : 'Date not recorded'}{pod.signed_by ? ` · Signed by ${pod.signed_by}` : ''}</div></div>
      <button className="secondary-button" disabled={openingId === pod.id} onClick={() => openPod(pod.id)}>{openingId === pod.id ? 'Opening…' : 'View POD'}</button>
    </div>)}</div>}

    {allowUpload && <div className="pod-upload">
      <div className="field"><label htmlFor="pod-file">Scanned docket</label><input id="pod-file" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
      <div className="two"><div className="field"><label>Signed by</label><input value={signedBy} onChange={(e) => setSignedBy(e.target.value)} placeholder="Optional" /></div><div className="field"><label>POD date</label><input type="date" value={podDate} onChange={(e) => setPodDate(e.target.value)} /></div></div>
      <div className="form-actions"><button className="button" onClick={upload} disabled={loading || !file}>{loading ? 'Uploading…' : 'Upload POD'}</button></div>
    </div>}

    {!allowUpload && pods.length === 0 && <p className="muted">POD upload becomes available once this order reaches delivery/completion.</p>}
    {error && <div className="error-box pod-error">{error}</div>}
  </div>;
}
