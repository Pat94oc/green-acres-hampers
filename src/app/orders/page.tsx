import Link from 'next/link';
import { Shell } from '@/components/shell';
import { requireHamperUser } from '@/lib/auth';
import { formatDate, methodLabel, statusLabel } from '@/lib/format';

export default async function Page(){
  const {supabase}=await requireHamperUser();
  const {data:orders}=await supabase.from('hamper_orders').select('id,order_number,delivery_date,status,fulfilment_method,priority,hamper_customers(name)').order('created_at',{ascending:false});
  return <Shell><div className="top"><div><div className="eyebrow">All active and historic orders</div><h1>Orders</h1></div><Link href="/new-order" className="button">+ New Order</Link></div><div className="card table-card"><table className="table"><thead><tr><th>Order</th><th>Customer</th><th>Due</th><th>Status</th><th>Method</th><th></th></tr></thead><tbody>{(orders??[]).map((o:any)=><tr key={o.id}><td><Link className="table-link" href={`/orders/${o.id}`}>{o.order_number}</Link>{o.priority&&<span className="pill priority">PRIORITY</span>}</td><td>{o.hamper_customers?.name??'—'}</td><td>{formatDate(o.delivery_date)}</td><td><span className="pill">{statusLabel(o.status)}</span></td><td>{methodLabel(o.fulfilment_method)}</td><td>{!['completed','cancelled'].includes(o.status)&&<Link className="secondary-button compact-button" href={`/orders/${o.id}/edit`}>Edit</Link>}</td></tr>)}{!orders?.length&&<tr><td colSpan={6} className="empty">No hamper orders yet.</td></tr>}</tbody></table></div></Shell>
}
