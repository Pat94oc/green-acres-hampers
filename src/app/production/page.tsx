import Link from 'next/link';
import { Shell } from '@/components/shell';
import { ProductionEntry } from '@/components/order-actions';
import { requireHamperUser } from '@/lib/auth';
import { formatDate, methodLabel } from '@/lib/format';

function isoFromUtcDate(d:Date){return d.toISOString().slice(0,10);}
function utcDateFromIso(value:string){const [y,m,d]=value.split('-').map(Number);return new Date(Date.UTC(y,m-1,d));}
function dublinTodayIso(){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Dublin',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const values=Object.fromEntries(parts.filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
function weekBounds(anchor?:string){
  const base=/^\d{4}-\d{2}-\d{2}$/.test(anchor??'')?anchor!:dublinTodayIso();
  const now=utcDateFromIso(base);
  const day=(now.getUTCDay()+6)%7;
  const start=new Date(now);start.setUTCDate(now.getUTCDate()-day);
  const end=new Date(start);end.setUTCDate(start.getUTCDate()+6);
  const prev=new Date(start);prev.setUTCDate(start.getUTCDate()-7);
  const next=new Date(start);next.setUTCDate(start.getUTCDate()+7);
  return {start:isoFromUtcDate(start),end:isoFromUtcDate(end),prev:isoFromUtcDate(prev),next:isoFromUtcDate(next)};
}
type Req={production_due_date:string|null;hamper_type_id:string|null;hamper_code_snapshot:string;description_snapshot:string;quantity_required:number;quantity_completed:number;quantity_remaining:number};
type Order={order_id:string;order_number:string;customer_name:string;production_due_date:string|null;delivery_date:string;fulfilment_method:string;priority:boolean;status:string;quantity_required:number;quantity_completed:number;quantity_remaining:number};
type Item={order_item_id:string;order_id:string;hamper_type_id:string|null;hamper_code_snapshot:string;description_snapshot:string;quantity_required:number;quantity_completed:number;quantity_remaining:number};

type BreakRow={name:string;required:number;made:number;remaining:number;dpd:number};

function addBreakdown(map:Map<string,BreakRow>,name:string,values:Partial<Omit<BreakRow,'name'>>){
  const row=map.get(name)??{name,required:0,made:0,remaining:0,dpd:0};
  row.required+=Number(values.required??0);
  row.made+=Number(values.made??0);
  row.remaining+=Number(values.remaining??0);
  row.dpd+=Number(values.dpd??0);
  map.set(name,row);
}

function MetricBreakdown({rows,field}:{rows:BreakRow[];field:'required'|'made'|'remaining'|'dpd'}){
  const visible=rows.filter(r=>r[field]>0);
  return <div className="metric-breakdown">{visible.length?visible.map(r=><div key={`${field}-${r.name}`}><span>{r.name}</span><strong>{r[field]}</strong></div>):<div><span>None</span><strong>0</strong></div>}</div>;
}

export default async function Production({searchParams}:{searchParams:Promise<{week?:string}>}){
  const query=await searchParams;
  const {supabase}=await requireHamperUser();
  const {start,end,prev,next}=weekBounds(query.week);

  const [{data:reqRows},{data:orderRows}]=await Promise.all([
    supabase.from('hamper_production_requirements').select('*').gte('production_due_date',start).lte('production_due_date',end).order('production_due_date').order('description_snapshot'),
    supabase.from('hamper_order_progress').select('*').gte('production_due_date',start).lte('production_due_date',end).neq('status','cancelled').order('priority',{ascending:false}).order('production_due_date').order('delivery_date')
  ]);

  const reqs=(reqRows??[]) as Req[];
  const orders=(orderRows??[]) as Order[];
  const orderIds=orders.map(o=>o.order_id);
  let items:Item[]=[];
  if(orderIds.length){
    const {data:itemRows}=await supabase.from('hamper_order_item_progress').select('*').in('order_id',orderIds);
    items=(itemRows??[]) as Item[];
  }

  const orderById=new Map(orders.map(o=>[o.order_id,o]));
  const weeklyMap=new Map<string,BreakRow>();
  for(const r of reqs){
    addBreakdown(weeklyMap,r.description_snapshot,{required:r.quantity_required,made:r.quantity_completed,remaining:r.quantity_remaining});
  }
  for(const item of items){
    const order=orderById.get(item.order_id);
    if(order?.fulfilment_method==='dpd') addBreakdown(weeklyMap,item.description_snapshot,{dpd:item.quantity_required});
  }
  const weeklyBreakdown=[...weeklyMap.values()].sort((a,b)=>a.name.localeCompare(b.name));

  const totalRequired=reqs.reduce((s,r)=>s+Number(r.quantity_required),0);
  const totalCompleted=reqs.reduce((s,r)=>s+Number(r.quantity_completed),0);
  const totalRemaining=reqs.reduce((s,r)=>s+Number(r.quantity_remaining),0);
  const dpdPackaging=weeklyBreakdown.reduce((s,r)=>s+r.dpd,0);
  const inProgress=orders.filter(o=>o.status==='in_progress').length;
  const ready=orders.filter(o=>o.status==='ready').length;
  const priority=orders.filter(o=>o.priority&&!['completed'].includes(o.status)).length;
  const dates=[...new Set(reqs.map(r=>r.production_due_date).filter(Boolean) as string[])].sort();

  return <Shell>
    <div className="top"><div><div className="eyebrow">Week · {formatDate(start)} – {formatDate(end)}</div><h1>Production Schedule</h1><p className="muted page-intro">Schedule is grouped by the <strong>Production Due Date / Ready By date</strong> on each order. Log production directly below; completed orders move to Ready automatically.</p></div><div className="top-actions"><Link className="secondary-button" href={`/production?week=${prev}`}>← Previous Week</Link><Link className="secondary-button" href="/production">This Week</Link><Link className="secondary-button" href={`/production?week=${next}`}>Next Week →</Link><Link className="button" href="/new-order">+ New Order</Link></div></div>

    <div className="grid schedule-summary">
      <div className="card metric"><span>Required This Week</span><strong>{totalRequired}</strong><div className="muted">total hampers</div><MetricBreakdown rows={weeklyBreakdown} field="required"/></div>
      <div className="card metric"><span>Made</span><strong>{totalCompleted}</strong><div className="muted">logged as produced</div><MetricBreakdown rows={weeklyBreakdown} field="made"/></div>
      <div className="card metric"><span>Remaining To Make</span><strong>{totalRemaining}</strong><div className="muted">still to produce</div><MetricBreakdown rows={weeklyBreakdown} field="remaining"/></div>
      <div className="card metric"><span>DPD Packaging</span><strong>{dpdPackaging}</strong><div className="muted">extra-packed hampers</div><MetricBreakdown rows={weeklyBreakdown} field="dpd"/></div>
    </div>
    <div className="mini-stats"><span><strong>{inProgress}</strong> orders in progress</span><span><strong>{ready}</strong> ready</span><span className={priority?'priority-text':''}><strong>{priority}</strong> priority</span></div>

    {dates.map(date=>{
      const dayReqs=reqs.filter(r=>r.production_due_date===date);
      const dayOrders=orders.filter(o=>o.production_due_date===date&&o.status!=='completed');
      const dayOrderIds=new Set(dayOrders.map(o=>o.order_id));
      const dayItems=items.filter(i=>dayOrderIds.has(i.order_id));
      const dayRequired=dayReqs.reduce((s,r)=>s+Number(r.quantity_required),0);
      const dayCompleted=dayReqs.reduce((s,r)=>s+Number(r.quantity_completed),0);
      const dayRemaining=dayReqs.reduce((s,r)=>s+Number(r.quantity_remaining),0);
      const dayDpd=items.filter(i=>{const o=orderById.get(i.order_id);return o?.production_due_date===date&&o.fulfilment_method==='dpd'}).reduce((s,i)=>s+Number(i.quantity_required),0);
      return <section className="schedule-day" key={date}>
        <div className="schedule-day-heading"><div><div className="eyebrow">Ready date</div><h2>{formatDate(date)}</h2></div><div className="day-totals"><span><strong>{dayRequired}</strong> required</span><span><strong>{dayCompleted}</strong> made</span><span><strong>{dayRemaining}</strong> remaining</span>{dayDpd>0&&<span><strong>{dayDpd}</strong> DPD pack</span>}</div></div>
        <div className="grid hamper-day-grid">{dayReqs.map(r=><div className="card metric hamper-total" key={`${date}-${r.hamper_type_id??r.hamper_code_snapshot}`}><span>{r.description_snapshot}</span><strong>{r.quantity_required}</strong><div className="muted">{r.quantity_completed} made · {r.quantity_remaining} remaining</div><div className="progress"><i style={{width:`${r.quantity_required?Math.min(100,Math.round((Number(r.quantity_completed)/Number(r.quantity_required))*100)):0}%`}}/></div></div>)}</div>

        {dayItems.length>0&&<div className="card table-card production-log-table"><div className="table-section-heading"><div><h3>Log Production</h3><p className="muted">Enter what has just been made. +1 / +5 / Finish Line update the order immediately.</p></div></div><table className="table"><thead><tr><th>Order</th><th>Customer</th><th>Hamper</th><th>Required</th><th>Made</th><th>Remaining</th><th>Log</th></tr></thead><tbody>{dayItems.map(item=>{const order=orderById.get(item.order_id);return <tr key={item.order_item_id}><td><Link className="table-link" href={`/orders/${item.order_id}`}>{order?.order_number??'—'}</Link>{order?.priority&&<span className="pill priority">PRIORITY</span>}</td><td>{order?.customer_name??'—'}</td><td>{item.description_snapshot}</td><td>{item.quantity_required}</td><td>{item.quantity_completed}</td><td>{item.quantity_remaining}</td><td>{item.quantity_remaining>0?<ProductionEntry orderId={item.order_id} itemId={item.order_item_id} remaining={item.quantity_remaining}/>:<span className="complete-mark">✓ Complete</span>}</td></tr>})}</tbody></table></div>}

        <div className="card table-card schedule-orders"><table className="table"><thead><tr><th>Order</th><th>Customer</th><th>Delivery</th><th>Hampers</th><th>Progress</th><th>Method</th><th>Status</th></tr></thead><tbody>{dayOrders.map(o=><tr key={o.order_id}><td><Link className="table-link" href={`/orders/${o.order_id}`}>{o.order_number}</Link>{o.priority&&<span className="pill priority">PRIORITY</span>}</td><td>{o.customer_name??'—'}</td><td>{formatDate(o.delivery_date)}</td><td>{o.quantity_required}</td><td>{o.quantity_completed} / {o.quantity_required}</td><td>{methodLabel(o.fulfilment_method)}</td><td>{o.status.replaceAll('_',' ')}</td></tr>)}</tbody></table></div>
      </section>
    })}
    {dates.length===0&&<div className="card empty-card">No production scheduled for this week yet.</div>}
  </Shell>
}
