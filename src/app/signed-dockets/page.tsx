import { Shell } from '@/components/shell';
import { SignedDocketUploader } from '@/components/signed-docket-uploader';
import { requireHamperUser } from '@/lib/auth';

export default async function Page(){
  const {supabase}=await requireHamperUser();
  const {data:review}=await supabase.from('hamper_pod_review').select('id,source_filename,page_number,extracted_order_number,confidence,created_at').eq('status','needs_review').order('created_at',{ascending:false}).limit(50);
  return <Shell><div className="eyebrow">Proof of delivery</div><h1>Signed Delivery Dockets</h1><p className="muted page-intro">A clearly detected hamper order number is matched automatically. The signed page is stored as POD and the order moves to Done.</p><SignedDocketUploader/><h2 className="section-title">Needs Review</h2><div className="card table-card"><table className="table"><thead><tr><th>Scan</th><th>Page</th><th>Detected Order</th><th>Confidence</th><th>Uploaded</th></tr></thead><tbody>{(review??[]).map((r:any)=><tr key={r.id}><td>{r.source_filename}</td><td>{r.page_number??'—'}</td><td>{r.extracted_order_number||'Not detected'}</td><td>{r.confidence!=null?`${Math.round(Number(r.confidence)*100)}%`:'—'}</td><td>{new Intl.DateTimeFormat('en-IE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(r.created_at))}</td></tr>)}{!review?.length&&<tr><td colSpan={5} className="empty">No signed dockets need review.</td></tr>}</tbody></table></div></Shell>
}
