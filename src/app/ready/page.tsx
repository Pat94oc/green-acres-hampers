import Link from 'next/link';
import { Shell } from '@/components/shell';
import { requireHamperUser } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { StatusAction } from '@/components/order-actions';

const groups=[['collection','Collection'],['green_acres','Green Acres Delivery'],['dpd','DPD']] as const;
export default async function Page(){
  const {supabase}=await requireHamperUser();
  const {data:orders}=await supabase.from('hamper_order_progress').select('*').eq('status','ready').order('priority',{ascending:false}).order('delivery_date');
  return <Shell><div className="eyebrow">Finished production</div><h1>Ready</h1><div className="grid">{groups.map(([key,label])=><div className="card metric" key={key}><span>{label}</span><strong>{(orders??[]).filter((o:any)=>o.fulfilment_method===key).reduce((s:number,o:any)=>s+Number(o.quantity_required),0)}</strong><div className="muted">hampers ready</div></div>)}</div>{groups.map(([key,label])=>{const list=(orders??[]).filter((o:any)=>o.fulfilment_method===key);return <section key={key}><h2 className="section-title">{label}</h2><div className="card table-card"><table className="table"><thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Hampers</th><th></th></tr></thead><tbody>{list.map((o:any)=><tr key={o.order_id}><td><Link className="table-link" href={`/orders/${o.order_id}`}>{o.order_number}</Link>{o.priority&&<span className="pill priority">PRIORITY</span>}</td><td>{o.customer_name}</td><td>{formatDate(o.delivery_date)}</td><td>{o.quantity_required}</td><td><StatusAction orderId={o.order_id} action="complete" label="Mark as Done"/></td></tr>)}{!list.length&&<tr><td colSpan={5} className="empty">None ready.</td></tr>}</tbody></table></div></section>})}</Shell>
}
