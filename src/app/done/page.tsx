import Link from 'next/link';
import { Shell } from '@/components/shell';
import { SignedDocketUploader } from '@/components/signed-docket-uploader';
import { requireHamperUser } from '@/lib/auth';
import { formatDate, methodLabel } from '@/lib/format';

export default async function Page(){
  const {supabase}=await requireHamperUser();
  const [{data:orders},{data:review}]=await Promise.all([
    supabase.from('hamper_orders').select('id,order_number,completed_at,fulfilment_method,hamper_customers(name),hamper_pods(id)').eq('status','completed').order('completed_at',{ascending:false}),
    supabase.from('hamper_pod_review').select('id,source_filename,page_number,extracted_order_number,confidence,created_at').eq('status','needs_review').order('created_at',{ascending:false}).limit(50)
  ]);
  return <Shell>
    <div className="eyebrow">Completed archive & proof of delivery</div>
    <h1>Done</h1>
    <p className="muted page-intro">Drop returned signed dockets here. Exact high-confidence order matches are filed as POD and the order is moved to Done automatically.</p>

    <SignedDocketUploader/>

    <h2 className="section-title">Scans Needing Review</h2>
    <div className="card table-card"><table className="table"><thead><tr><th>Scan</th><th>Page</th><th>Detected Order</th><th>Confidence</th><th>Uploaded</th></tr></thead><tbody>{(review??[]).map((r:any)=><tr key={r.id}><td>{r.source_filename}</td><td>{r.page_number??'—'}</td><td>{r.extracted_order_number||'Not detected'}</td><td>{r.confidence==null?'—':`${Math.round(Number(r.confidence)*100)}%`}</td><td>{new Intl.DateTimeFormat('en-IE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(r.created_at))}</td></tr>)}{!review?.length&&<tr><td colSpan={5} className="empty">No signed dockets need review.</td></tr>}</tbody></table></div>

    <h2 className="section-title">Completed Orders</h2>
    <div className="card table-card"><table className="table"><thead><tr><th>Order</th><th>Customer</th><th>Completed</th><th>Method</th><th>POD</th></tr></thead><tbody>{(orders??[]).map((o:any)=><tr key={o.id}><td><Link className="table-link" href={`/orders/${o.id}`}>{o.order_number}</Link></td><td>{o.hamper_customers?.name??'—'}</td><td>{o.completed_at?formatDate(o.completed_at.slice(0,10)):'—'}</td><td>{methodLabel(o.fulfilment_method)}</td><td>{o.hamper_pods?.length?'✓ POD':'—'}</td></tr>)}{!orders?.length&&<tr><td colSpan={5} className="empty">No completed hamper orders yet.</td></tr>}</tbody></table></div>
  </Shell>;
}
