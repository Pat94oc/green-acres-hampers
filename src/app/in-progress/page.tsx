import Link from 'next/link';
import { Shell } from '@/components/shell';
import { requireHamperUser } from '@/lib/auth';
import { formatDate, methodLabel } from '@/lib/format';

export default async function Page(){
  const {supabase}=await requireHamperUser();
  const {data:orders}=await supabase.from('hamper_order_progress').select('*').eq('status','in_progress').order('priority',{ascending:false}).order('delivery_date');
  return <Shell><div className="eyebrow">Live work</div><h1>In Progress</h1><div className="stack">{(orders??[]).map((o:any)=>{const pct=o.quantity_required?Math.min(100,Math.round((o.quantity_completed/o.quantity_required)*100)):0;return <Link href={`/orders/${o.order_id}`} className="card work-card" key={o.order_id}><div className="section-row"><div><h3>{o.customer_name} {o.priority&&<span className="pill priority">PRIORITY</span>}</h3><p className="muted">{o.order_number} · Due {formatDate(o.delivery_date)} · {methodLabel(o.fulfilment_method)}</p></div><strong>{o.quantity_completed} / {o.quantity_required}</strong></div><div className="progress"><i style={{width:`${pct}%`}}/></div><div className="muted progress-caption">{o.quantity_remaining} remaining</div></Link>})}{!orders?.length&&<div className="card empty-card">Nothing is currently in progress.</div>}</div></Shell>
}
