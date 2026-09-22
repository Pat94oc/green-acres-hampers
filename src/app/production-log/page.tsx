import { Shell } from '@/components/shell';
import { requireHamperUser } from '@/lib/auth';

export default async function Page(){
  const {supabase}=await requireHamperUser();
  const [{data:logs},{data:users}]=await Promise.all([
    supabase.from('hamper_production_log').select('id,quantity_delta,note,created_at,created_by_user_id,hamper_orders(order_number,hamper_customers(name)),hamper_order_items(description_snapshot)').order('created_at',{ascending:false}).limit(250),
    supabase.from('hamper_app_users').select('user_id,display_name')
  ]);
  const names=new Map((users??[]).map((u:any)=>[u.user_id,u.display_name]));
  return <Shell><div className="eyebrow">Audit trail</div><h1>Production Log</h1><div className="card table-card"><table className="table"><thead><tr><th>Date / Time</th><th>Order</th><th>Customer</th><th>Hamper</th><th>Qty</th><th>Logged By</th><th>Note</th></tr></thead><tbody>{(logs??[]).map((l:any)=><tr key={l.id}><td>{new Intl.DateTimeFormat('en-IE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(l.created_at))}</td><td>{l.hamper_orders?.order_number??'—'}</td><td>{l.hamper_orders?.hamper_customers?.name??'—'}</td><td>{l.hamper_order_items?.description_snapshot??'—'}</td><td>{Number(l.quantity_delta)>0?`+${l.quantity_delta}`:l.quantity_delta}</td><td>{names.get(l.created_by_user_id)??'Staff'}</td><td>{l.note||'—'}</td></tr>)}{!logs?.length&&<tr><td colSpan={7} className="empty">No production has been logged yet.</td></tr>}</tbody></table></div></Shell>
}
