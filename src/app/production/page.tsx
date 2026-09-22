import Link from 'next/link';
import { Shell } from '@/components/shell';
import { requireHamperUser } from '@/lib/auth';
import { formatDate, methodLabel } from '@/lib/format';

function weekBounds(anchor?:string){const now=anchor&&/^\d{4}-\d{2}-\d{2}$/.test(anchor)?new Date(`${anchor}T12:00:00`):new Date();const day=(now.getDay()+6)%7;const start=new Date(now);start.setHours(12,0,0,0);start.setDate(now.getDate()-day);const end=new Date(start);end.setDate(start.getDate()+6);const prev=new Date(start);prev.setDate(start.getDate()-7);const next=new Date(start);next.setDate(start.getDate()+7);const iso=(d:Date)=>d.toISOString().slice(0,10);return {start:iso(start),end:iso(end),prev:iso(prev),next:iso(next)};}

type Req={production_due_date:string|null;hamper_type_id:string|null;hamper_code_snapshot:string;description_snapshot:string;quantity_required:number;quantity_completed:number;quantity_remaining:number};
type Order={order_id:string;order_number:string;customer_name:string;production_due_date:string|null;delivery_date:string;fulfilment_method:string;priority:boolean;status:string;quantity_required:number;quantity_completed:number;quantity_remaining:number};

export default async function Production({searchParams}:{searchParams:Promise<{week?:string}>}){
  const query=await searchParams;
  const {supabase}=await requireHamperUser(); const {start,end,prev,next}=weekBounds(query.week);
  const [{data:reqRows},{data:orderRows}]=await Promise.all([
    supabase.from('hamper_production_requirements').select('*').gte('production_due_date',start).lte('production_due_date',end).order('production_due_date').order('description_snapshot'),
    supabase.from('hamper_order_progress').select('*').gte('production_due_date',start).lte('production_due_date',end).not('status','in','("completed","cancelled")').order('priority',{ascending:false}).order('production_due_date').order('delivery_date')
  ]);
  const reqs=(reqRows??[]) as Req[]; const orders=(orderRows??[]) as Order[];
  const totalRequired=reqs.reduce((s,r)=>s+Number(r.quantity_required),0);
  const totalCompleted=reqs.reduce((s,r)=>s+Number(r.quantity_completed),0);
  const totalRemaining=reqs.reduce((s,r)=>s+Number(r.quantity_remaining),0);
  const inProgress=orders.filter(o=>o.status==='in_progress').length;
  const ready=orders.filter(o=>o.status==='ready').length;
  const priority=orders.filter(o=>o.priority).length;
  const dpdPackaging=orders.filter(o=>o.fulfilment_method==='dpd').reduce((s,o)=>s+Number(o.quantity_required),0);
  const dates=[...new Set(reqs.map(r=>r.production_due_date).filter(Boolean) as string[])].sort();

  return <Shell>
    <div className="top"><div><div className="eyebrow">Week · {formatDate(start)} – {formatDate(end)}</div><h1>Production Schedule</h1><p className="muted page-intro">Totals are grouped by the date each order needs to be ready.</p></div><div className="top-actions"><Link className="secondary-button" href={`/production?week=${prev}`}>← Previous Week</Link><Link className="secondary-button" href="/production">This Week</Link><Link className="secondary-button" href={`/production?week=${next}`}>Next Week →</Link><Link className="button" href="/new-order">+ New Order</Link></div></div>
    <div className="grid schedule-summary">
      <div className="card metric"><span>Required This Week</span><strong>{totalRequired}</strong><div className="muted">total hampers</div></div>
      <div className="card metric"><span>Made</span><strong>{totalCompleted}</strong><div className="muted">logged as produced</div></div>
      <div className="card metric"><span>Remaining</span><strong>{totalRemaining}</strong><div className="muted">still to make</div></div>
      <div className="card metric"><span>DPD Packaging</span><strong>{dpdPackaging}</strong><div className="muted">hampers requiring delivery packaging</div></div>
    </div>
    <div className="mini-stats"><span><strong>{inProgress}</strong> orders in progress</span><span><strong>{ready}</strong> ready</span><span className={priority?'priority-text':''}><strong>{priority}</strong> priority</span></div>

    {dates.map(date=>{
      const dayReqs=reqs.filter(r=>r.production_due_date===date);
      const dayOrders=orders.filter(o=>o.production_due_date===date);
      const dayRequired=dayReqs.reduce((s,r)=>s+Number(r.quantity_required),0);
      const dayCompleted=dayReqs.reduce((s,r)=>s+Number(r.quantity_completed),0);
      const dayRemaining=dayReqs.reduce((s,r)=>s+Number(r.quantity_remaining),0);
      const dayDpd=dayOrders.filter(o=>o.fulfilment_method==='dpd').reduce((s,o)=>s+Number(o.quantity_required),0);
      return <section className="schedule-day" key={date}>
        <div className="schedule-day-heading"><div><div className="eyebrow">Ready date</div><h2>{formatDate(date)}</h2></div><div className="day-totals"><span><strong>{dayRequired}</strong> required</span><span><strong>{dayCompleted}</strong> made</span><span><strong>{dayRemaining}</strong> remaining</span>{dayDpd>0&&<span><strong>{dayDpd}</strong> DPD pack</span>}</div></div>
        <div className="grid hamper-day-grid">{dayReqs.map(r=><div className="card metric hamper-total" key={`${date}-${r.hamper_type_id??r.hamper_code_snapshot}`}><span>{r.description_snapshot}</span><strong>{r.quantity_required}</strong><div className="muted">{r.quantity_completed} made · {r.quantity_remaining} remaining</div><div className="progress"><i style={{width:`${r.quantity_required?Math.min(100,Math.round((Number(r.quantity_completed)/Number(r.quantity_required))*100)):0}%`}}/></div></div>)}</div>
        <div className="card table-card schedule-orders"><table className="table"><thead><tr><th>Order</th><th>Customer</th><th>Hampers</th><th>Progress</th><th>Method</th><th>Status</th></tr></thead><tbody>{dayOrders.map(o=><tr key={o.order_id}><td><Link className="table-link" href={`/orders/${o.order_id}`}>{o.order_number}</Link>{o.priority&&<span className="pill priority">PRIORITY</span>}</td><td>{o.customer_name??'—'}</td><td>{o.quantity_required}</td><td>{o.quantity_completed} / {o.quantity_required}</td><td>{methodLabel(o.fulfilment_method)}</td><td>{o.status.replaceAll('_',' ')}</td></tr>)}</tbody></table></div>
      </section>
    })}
    {dates.length===0&&<div className="card empty-card">No production scheduled for this week yet.</div>}
  </Shell>
}
