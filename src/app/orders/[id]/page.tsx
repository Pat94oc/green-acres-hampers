import { notFound } from 'next/navigation';
import { Shell } from '@/components/shell';
import { requireHamperUser } from '@/lib/auth';
import { formatDate, methodLabel, statusLabel } from '@/lib/format';
import { ProductionEntry, StatusAction } from '@/components/order-actions';
import { PodPanel } from '@/components/pod-panel';
import { DeleteOrderButton } from '@/components/delete-order-button';

export default async function Page({params}:{params:Promise<{id:string}>}){
  const {id}=await params; const {supabase}=await requireHamperUser();
  const [{data:order},{data:items},{data:events},{data:pods}]=await Promise.all([
    supabase.from('hamper_orders').select('*,hamper_customers(name)').eq('id',id).single(),
    supabase.from('hamper_order_item_progress').select('*').eq('order_id',id),
    supabase.from('hamper_order_events').select('id,event_type,created_at').eq('order_id',id).order('created_at',{ascending:false}).limit(12),
    supabase.from('hamper_pods').select('id,display_filename,signed_by,pod_date,created_at').eq('order_id',id).order('created_at',{ascending:false})
  ]);
  if(!order) notFound();
  const remaining=(items??[]).reduce((s:any,i:any)=>s+Number(i.quantity_remaining),0);
  const required=(items??[]).reduce((s:any,i:any)=>s+Number(i.quantity_required),0);
  const completed=(items??[]).reduce((s:any,i:any)=>s+Number(i.quantity_completed),0);
  return <Shell><div className="top"><div><div className="eyebrow">{order.priority?'Priority order':'Hamper order'}</div><h1>{order.order_number}</h1></div><div className="top-actions">{!['completed','cancelled'].includes(order.status)&&<a className="secondary-button" href={`/orders/${id}/edit`}>Edit Order</a>}<a className="secondary-button" href={`/orders/${id}/docket`} target="_blank">Print Docket</a>{order.status==='scheduled'&&<StatusAction orderId={id} action="start" label="Start Production" secondary/>}{['scheduled','in_progress'].includes(order.status)&&remaining>0&&<StatusAction orderId={id} action="production-complete" label="Complete Production"/>}{order.status==='ready'&&<StatusAction orderId={id} action="complete" label="Mark as Done"/>}{!['completed','cancelled'].includes(order.status)&&<DeleteOrderButton orderId={id}/>}</div></div>
    <div className="grid detail-grid"><div className="card metric"><span>Status</span><strong className="metric-text">{statusLabel(order.status)}</strong></div><div className="card metric"><span>Total Hampers</span><strong>{required}</strong></div><div className="card metric"><span>Completed</span><strong>{completed}</strong></div><div className="card metric"><span>Remaining</span><strong>{remaining}</strong></div></div>
    <div className="two content-grid"><div className="card"><h2>Order</h2><dl className="details"><dt>Customer</dt><dd>{order.hamper_customers?.name}</dd><dt>Delivery / Collection</dt><dd>{formatDate(order.delivery_date)}</dd><dt>Production Due</dt><dd>{formatDate(order.production_due_date)}</dd><dt>Method</dt><dd>{methodLabel(order.fulfilment_method)}</dd><dt>Customer Ref.</dt><dd>{order.customer_order_reference||'—'}</dd></dl>{order.priority&&<div className="priority-banner">PRIORITY</div>}</div><div className="card"><h2>Delivery Details</h2><p>{[order.delivery_address_1,order.delivery_address_2,order.delivery_town,order.delivery_county,order.delivery_eircode].filter(Boolean).join(', ')||'Collection / no delivery address'}</p><p><strong>Contact:</strong> {order.contact_name||'—'}<br/><strong>Phone:</strong> {order.contact_phone||'—'}<br/><strong>Email:</strong> {order.contact_email||'—'}</p>{order.delivery_notes&&<p><strong>Instructions:</strong><br/>{order.delivery_notes}</p>}</div></div>
    <h2 className="section-title">Production</h2><div className="card"><p className="muted production-help">Logging any quantity automatically puts a scheduled order In Progress. When every hamper line is complete, the order moves to <strong>Ready</strong> automatically. Use <strong>Complete Production</strong> above to log all remaining quantities at once.</p><div className="table-card"><table className="table"><thead><tr><th>Hamper</th><th>Required</th><th>Complete</th><th>Remaining</th><th>Log Production</th></tr></thead><tbody>{(items??[]).map((i:any)=><tr key={i.order_item_id}><td>{i.description_snapshot}</td><td>{i.quantity_required}</td><td>{i.quantity_completed}</td><td>{i.quantity_remaining}</td><td>{i.quantity_remaining>0?<ProductionEntry orderId={id} itemId={i.order_item_id} remaining={i.quantity_remaining}/>:<span className="complete-mark">✓ Complete</span>}</td></tr>)}</tbody></table></div></div>
    <h2 className="section-title">Delivery Documentation</h2><PodPanel orderId={id} pods={(pods??[]) as any} allowUpload={['delivered','completed'].includes(order.status)} />
    <h2 className="section-title">Order History</h2><div className="card event-list">{(events??[]).map((e:any)=><div key={e.id}><strong>{statusLabel(e.event_type)}</strong><span>{new Intl.DateTimeFormat('en-IE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(e.created_at))}</span></div>)}{!events?.length&&<p className="muted">No history yet.</p>}</div>
  </Shell>
}
