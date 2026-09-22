import Link from 'next/link';
import { Shell } from '@/components/shell';
import { requireHamperUser } from '@/lib/auth';
import { formatDate, methodLabel } from '@/lib/format';

function weekBounds(){const now=new Date();const day=(now.getDay()+6)%7;const start=new Date(now);start.setHours(12,0,0,0);start.setDate(now.getDate()-day);const end=new Date(start);end.setDate(start.getDate()+6);const iso=(d:Date)=>d.toISOString().slice(0,10);return {start:iso(start),end:iso(end)};}

export default async function Production(){
  const {supabase}=await requireHamperUser(); const {start,end}=weekBounds();
  const [{data:reqs},{data:orders}]=await Promise.all([
    supabase.from('hamper_production_requirements').select('*').gte('production_due_date',start).lte('production_due_date',end).order('description_snapshot'),
    supabase.from('hamper_order_progress').select('*').gte('production_due_date',start).lte('production_due_date',end).not('status','in','("completed","cancelled")').order('priority',{ascending:false}).order('production_due_date')
  ]);
  const byHamper=new Map<string,{name:string,required:number,completed:number,remaining:number}>();
  for(const r of reqs??[]){const key=r.hamper_type_id??r.hamper_code_snapshot;const cur=byHamper.get(key)||{name:r.description_snapshot,required:0,completed:0,remaining:0};cur.required+=Number(r.quantity_required);cur.completed+=Number(r.quantity_completed);cur.remaining+=Number(r.quantity_remaining);byHamper.set(key,cur);}
  return <Shell><div className="top"><div><div className="eyebrow">This week · {formatDate(start)} – {formatDate(end)}</div><h1>Production</h1></div><Link className="button" href="/new-order">+ New Order</Link></div><div className="grid">{[...byHamper.values()].map(h=><div className="card metric" key={h.name}><span>{h.name}</span><strong>{h.remaining}</strong><div className="muted">remaining of {h.required} · {h.completed} complete</div></div>)}{byHamper.size===0&&<div className="card empty-card">No production scheduled for this week yet.</div>}</div><h2 className="section-title">Orders due for production this week</h2><div className="card table-card"><table className="table"><thead><tr><th>Order</th><th>Customer</th><th>Production Due</th><th>Required</th><th>Progress</th><th>Method</th></tr></thead><tbody>{(orders??[]).map((o:any)=><tr key={o.order_id}><td><Link className="table-link" href={`/orders/${o.order_id}`}>{o.order_number}</Link>{o.priority&&<span className="pill priority">PRIORITY</span>}</td><td>{o.customer_name??'—'}</td><td>{formatDate(o.production_due_date)}</td><td>{o.quantity_required}</td><td>{o.quantity_completed} / {o.quantity_required}</td><td>{methodLabel(o.fulfilment_method)}</td></tr>)}{!orders?.length&&<tr><td colSpan={6} className="empty">No orders scheduled for this week.</td></tr>}</tbody></table></div></Shell>
}
