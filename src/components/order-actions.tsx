'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ProductionEntry({orderId,itemId,remaining}:{orderId:string;itemId:string;remaining:number}){
  const [qty,setQty]=useState(Math.max(1,remaining)); const [error,setError]=useState(''); const [loading,setLoading]=useState(false); const router=useRouter();
  async function save(){setLoading(true);setError('');const res=await fetch('/api/production',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId,orderItemId:itemId,quantity:qty})});const json=await res.json();setLoading(false);if(!res.ok){setError(json.error||'Could not update production');return;}router.refresh();}
  return <div className="production-entry"><input type="number" min="1" max={Math.max(1,remaining)} value={qty} onChange={e=>setQty(Number(e.target.value))}/><button className="small-button" onClick={save} disabled={loading||remaining<=0}>{loading?'Saving…':`Add ${qty}`}</button>{error&&<span className="inline-error">{error}</span>}</div>
}

export function StatusAction({orderId,action,label}:{orderId:string;action:'ready'|'delivered'|'complete';label:string}){
  const [loading,setLoading]=useState(false);const [error,setError]=useState('');const router=useRouter();
  async function run(){setLoading(true);setError('');const res=await fetch(`/api/orders/${orderId}/${action}`,{method:'POST'});const json=await res.json();setLoading(false);if(!res.ok){setError(json.error||'Could not update order');return;}router.refresh();}
  return <div className="action-stack"><button className="button" onClick={run} disabled={loading}>{loading?'Updating…':label}</button>{error&&<span className="inline-error">{error}</span>}</div>
}
