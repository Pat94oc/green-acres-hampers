'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ProductionEntry({orderId,itemId,remaining}:{orderId:string;itemId:string;remaining:number}){
  const [qty,setQty]=useState(Math.max(1,remaining));
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const router=useRouter();

  async function save(amount:number){
    if(amount<=0) return;
    setLoading(true);setError('');
    const res=await fetch('/api/production',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId,orderItemId:itemId,quantity:amount})});
    const json=await res.json();setLoading(false);
    if(!res.ok){setError(json.error||'Could not update production');return;}
    router.refresh();
  }

  return <div className="production-controls">
    <div className="quick-buttons">
      <button className="small-button" onClick={()=>save(1)} disabled={loading||remaining<1}>+1</button>
      <button className="small-button" onClick={()=>save(Math.min(5,remaining))} disabled={loading||remaining<1}>+5</button>
      <button className="small-button" onClick={()=>save(remaining)} disabled={loading||remaining<1}>Finish Line</button>
    </div>
    <div className="production-entry"><input type="number" min="1" max={Math.max(1,remaining)} value={qty} onChange={e=>setQty(Number(e.target.value))}/><button className="secondary-button compact-button" onClick={()=>save(Math.min(qty,remaining))} disabled={loading||remaining<=0}>{loading?'Saving…':'Add Qty'}</button></div>
    {error&&<span className="inline-error">{error}</span>}
  </div>
}

export function StatusAction({orderId,action,label,secondary=false}:{orderId:string;action:'start'|'production-complete'|'ready'|'delivered'|'complete';label:string;secondary?:boolean}){
  const [loading,setLoading]=useState(false);const [error,setError]=useState('');const router=useRouter();
  async function run(){setLoading(true);setError('');const res=await fetch(`/api/orders/${orderId}/${action}`,{method:'POST'});const json=await res.json();setLoading(false);if(!res.ok){setError(json.error||'Could not update order');return;}router.refresh();}
  return <div className="action-stack"><button className={secondary?'secondary-button':'button'} onClick={run} disabled={loading}>{loading?'Updating…':label}</button>{error&&<span className="inline-error">{error}</span>}</div>
}
