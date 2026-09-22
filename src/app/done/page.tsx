import Link from 'next/link';
import { Shell } from '@/components/shell';
import { requireHamperUser } from '@/lib/auth';
import { formatDate, methodLabel } from '@/lib/format';

export default async function Page(){
  const {supabase}=await requireHamperUser();
  const {data:orders}=await supabase.from('hamper_orders').select('id,order_number,completed_at,fulfilment_method,hamper_customers(name),hamper_pods(id)').eq('status','completed').order('completed_at',{ascending:false});
  return <Shell><div className="eyebrow">Completed archive</div><h1>Done</h1><div className="card table-card"><table className="table"><thead><tr><th>Order</th><th>Customer</th><th>Completed</th><th>Method</th><th>POD</th></tr></thead><tbody>{(orders??[]).map((o:any)=><tr key={o.id}><td><Link className="table-link" href={`/orders/${o.id}`}>{o.order_number}</Link></td><td>{o.hamper_customers?.name??'—'}</td><td>{o.completed_at?formatDate(o.completed_at.slice(0,10)):'—'}</td><td>{methodLabel(o.fulfilment_method)}</td><td>{o.hamper_pods?.length?'✓ POD':'—'}</td></tr>)}{!orders?.length&&<tr><td colSpan={5} className="empty">No completed hamper orders yet.</td></tr>}</tbody></table></div></Shell>
}
