'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Hamper = { id:string; code:string; name:string };
type Staff = { user_id:string; display_name:string };
type Line = { hamper_type_id:string; quantity:number; special_requirements:string };
type Initial = {
  customerName:string; contactName:string; phone:string; email:string; customerReference:string;
  fulfilmentMethod:string; deliveryDate:string; productionDueDate:string;
  address1:string; address2:string; town:string; county:string; eircode:string; notes:string;
  priority:boolean; takenByUserId:string; lines:Line[];
};

export function EditOrderForm({ orderId, hampers, staff, initial, hasProduction }:{ orderId:string; hampers:Hamper[]; staff:Staff[]; initial:Initial; hasProduction:boolean }) {
  const router=useRouter();
  const [method,setMethod]=useState(initial.fulfilmentMethod);
  const [deliveryDate,setDeliveryDate]=useState(initial.deliveryDate);
  const [productionDueDate,setProductionDueDate]=useState(initial.productionDueDate);
  const [lines,setLines]=useState<Line[]>(initial.lines.length ? initial.lines : [{hamper_type_id:hampers[0]?.id??'',quantity:1,special_requirements:''}]);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const total=useMemo(()=>lines.reduce((s,l)=>s+(Number(l.quantity)||0),0),[lines]);

  function updateLine(index:number,patch:Partial<Line>){if(hasProduction)return;setLines(v=>v.map((line,i)=>i===index?{...line,...patch}:line));}
  function addLine(){if(hasProduction)return;setLines(v=>[...v,{hamper_type_id:hampers[0]?.id??'',quantity:1,special_requirements:''}]);}
  function removeLine(index:number){if(hasProduction)return;if(lines.length>1)setLines(v=>v.filter((_,i)=>i!==index));}

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setSaving(true);setError('');
    const f=new FormData(e.currentTarget);
    const payload={
      customerName:f.get('customerName'),contactName:f.get('contactName'),phone:f.get('phone'),email:f.get('email'),customerReference:f.get('customerReference'),
      fulfilmentMethod:method,deliveryDate,productionDueDate,address1:f.get('address1'),address2:f.get('address2'),town:f.get('town'),county:f.get('county'),eircode:f.get('eircode'),notes:f.get('notes'),
      priority:f.get('priority')==='on',takenByUserId:f.get('takenByUserId'),items:lines.map(l=>({hamper_type_id:l.hamper_type_id,quantity:Number(l.quantity),special_requirements:l.special_requirements})),
    };
    const res=await fetch(`/api/orders/${orderId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const json=await res.json();setSaving(false);
    if(!res.ok){setError(json.error||'Could not update order');return;}
    router.push(`/orders/${orderId}`);router.refresh();
  }

  return <form className="form" onSubmit={submit}>
    {hasProduction&&<div className="warning-box"><strong>Production has already been logged.</strong> Customer, dates, fulfilment and delivery details can still be edited, but hamper lines are locked so production history stays accurate.</div>}
    <div className="form-section"><h2>Customer</h2><div className="two"><div className="field"><label>Customer / Company *</label><input name="customerName" required defaultValue={initial.customerName}/></div><div className="field"><label>Contact Name</label><input name="contactName" defaultValue={initial.contactName}/></div></div><div className="two"><div className="field"><label>Phone</label><input name="phone" defaultValue={initial.phone}/></div><div className="field"><label>Email</label><input name="email" type="email" defaultValue={initial.email}/></div></div><div className="field"><label>Customer PO / Reference</label><input name="customerReference" defaultValue={initial.customerReference}/></div></div>
    <div className="form-section"><h2>Fulfilment</h2><div className="two"><div className="field"><label>Method *</label><select value={method} onChange={e=>setMethod(e.target.value)}><option value="collection">Collection</option><option value="green_acres">Green Acres Delivery</option><option value="dpd">DPD</option></select></div><div className="field"><label>Delivery / Collection Date *</label><input type="date" value={deliveryDate} onChange={e=>setDeliveryDate(e.target.value)} required/></div></div><div className="field"><label>Ready By / Production Due Date *</label><input type="date" value={productionDueDate} onChange={e=>setProductionDueDate(e.target.value)} required/></div>{method!=='collection'&&<><div className="two"><div className="field"><label>Address Line 1</label><input name="address1" defaultValue={initial.address1}/></div><div className="field"><label>Address Line 2</label><input name="address2" defaultValue={initial.address2}/></div></div><div className="three"><div className="field"><label>Town</label><input name="town" defaultValue={initial.town}/></div><div className="field"><label>County</label><input name="county" defaultValue={initial.county}/></div><div className="field"><label>Eircode</label><input name="eircode" defaultValue={initial.eircode}/></div></div></>}</div>
    <div className="form-section"><div className="section-row"><h2>Hamper Lines</h2><span className="pill">{total} hampers</span></div>{lines.map((line,i)=><div className="line-row" key={i}><div className="field grow"><label>Hamper</label><select value={line.hamper_type_id} onChange={e=>updateLine(i,{hamper_type_id:e.target.value})} disabled={hasProduction}>{hampers.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}</select></div><div className="field qty"><label>Qty</label><input type="number" min="1" value={line.quantity} onChange={e=>updateLine(i,{quantity:Number(e.target.value)})} disabled={hasProduction}/></div><div className="field grow"><label>Special requirements</label><input value={line.special_requirements} onChange={e=>updateLine(i,{special_requirements:e.target.value})} disabled={hasProduction}/></div>{!hasProduction&&<button className="icon-button" type="button" onClick={()=>removeLine(i)} aria-label="Remove line">×</button>}</div>)}{!hasProduction&&<button type="button" className="secondary-button" onClick={addLine}>+ Add another hamper</button>}</div>
    <div className="form-section"><div className="two"><div className="field"><label>Order Taken By</label><select name="takenByUserId" defaultValue={initial.takenByUserId}>{staff.map(s=><option key={s.user_id} value={s.user_id}>{s.display_name}</option>)}</select></div><div className="field checkbox-field"><label><input type="checkbox" name="priority" defaultChecked={initial.priority}/> Mark this order as PRIORITY</label></div></div><div className="field"><label>Notes / Delivery Instructions</label><textarea name="notes" rows={4} defaultValue={initial.notes}/></div></div>
    {error&&<div className="error-box">{error}</div>}<div className="form-actions"><button className="button" disabled={saving}>{saving?'Saving…':'Save Changes'}</button><button type="button" className="secondary-button" onClick={()=>router.push(`/orders/${orderId}`)}>Cancel</button></div>
  </form>;
}
