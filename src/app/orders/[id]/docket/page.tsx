import { notFound } from 'next/navigation';
import { requireHamperUser } from '@/lib/auth';
import { formatDate, methodLabel } from '@/lib/format';
import { PrintButton } from './print-button';

export default async function Page({params}:{params:Promise<{id:string}>}){
  const {id}=await params;const {supabase}=await requireHamperUser();
  const [{data:order},{data:items}]=await Promise.all([
    supabase.from('hamper_orders').select('*,hamper_customers(name)').eq('id',id).single(),
    supabase.from('hamper_order_items').select('description_snapshot,quantity_required,special_requirements').eq('order_id',id).order('created_at')
  ]);
  if(!order) notFound();
  const total=(items??[]).reduce((s:any,i:any)=>s+Number(i.quantity_required),0);
  const isCollection=order.fulfilment_method==='collection';
  return <main className="docket-page"><div className="no-print docket-toolbar"><PrintButton/></div><header className="docket-header"><div><div className="docket-brand">GREEN ACRES</div><div>Hamper Delivery Docket</div></div><div className="docket-meta"><strong>{order.order_number}</strong><span>{formatDate(order.delivery_date)}</span></div></header><div className="docket-two"><section><h3>Customer</h3><p><strong>{order.hamper_customers?.name}</strong><br/>{order.contact_name||''}<br/>{order.contact_phone||''}<br/>{order.contact_email||''}</p></section><section><h3>{isCollection?'Collection':'Delivery'}</h3><p><strong>{methodLabel(order.fulfilment_method)}</strong><br/>{[order.delivery_address_1,order.delivery_address_2,order.delivery_town,order.delivery_county,order.delivery_eircode].filter(Boolean).join(', ')}</p></section></div>{order.customer_order_reference&&<p><strong>Customer Reference:</strong> {order.customer_order_reference}</p>}<table className="docket-table"><thead><tr><th>Description</th><th>Qty</th><th>Check</th></tr></thead><tbody>{(items??[]).map((i:any,idx:number)=><tr key={idx}><td>{i.description_snapshot}{i.special_requirements&&<small>{i.special_requirements}</small>}</td><td>{i.quantity_required}</td><td>□</td></tr>)}</tbody><tfoot><tr><td>Total Hampers</td><td>{total}</td><td></td></tr></tfoot></table>{order.delivery_notes&&<div className="docket-notes"><strong>Instructions</strong><p>{order.delivery_notes}</p></div>}<div className="signature-grid"><div><span>{isCollection?'Collected By':'Prepared By'}</span><div className="signature-line"/></div><div><span>{isCollection?'Signature':'Delivered By'}</span><div className="signature-line"/></div><div><span>{isCollection?'Date / Time':'Received By'}</span><div className="signature-line"/></div><div><span>{isCollection?'':'Signature / Date'}</span><div className="signature-line"/></div></div></main>
}
