'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.replace('/production');
    router.refresh();
  }

  return <form className="form" onSubmit={submit}>
    <div className="field"><label>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
    <div className="field"><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></div>
    {error && <div className="error-box">{error}</div>}
    <button className="button" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
  </form>;
}
