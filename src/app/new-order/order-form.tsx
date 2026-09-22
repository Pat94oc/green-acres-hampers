'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Hamper = { id:string; code:string; name:string };
type Staff = { user_id:string; display_name:string };
type Line = { hamper_type_id:string; quantity:number; special_requirements:string };

export function OrderForm({ hampers, staff, currentUserId }: { hampers:Hamper[]; staff:Staff[]; currentUserId:string }) {
  const router = useRouter();
  const [method,setMethod] = useState('collection');
  const [deliveryDate,setDeliveryDate] = useState('');
  const [productionDueDate,setProductionDueDate] = useState('');
  const [lines,setLines] = useState<Line[]>([{hamper_type_id:hampers[0]?.id ?? '',quantity:1,special_requirements:''}]);
  const [saving,setSaving] = useState(false); const [error,setError] = useState('');
  const total = useMemo(()=>lines.reduce((s,l)=>s+(Number(l.quantity)||0),0),[lines]);

  function updateLine(index:number, patch:Partial<Line>) { setLines(v=>v.map((line,i)=>i===index?{...line,...patch}:line)); }
  function addLine(){ setLines(v=>[...v,{hamper_type_id:hampers[0]?.id ?? '',quantity:1,special_requirements:''}]); }
  function removeLine(index:number){ if(lines.length>1) setLines(v=>v.filter((_,i)=>i!==index)); }

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault(); setSaving(true); setError('');
    const f=new FormData(e.currentTarget);
    const payload={
      customerName:f.get('customerName'), contactName:f.get('contactName'), phone:f.get('phone'), email:f.get('email'),
      customerReference:f.get('customerReference'), fulfilmentMethod:method, deliveryDate, productionDueDate:productionDueDate||null,
      address1:f.get('address1'), address2:f.get('address2'), town:f.get('town'), county:f.get('county'), eircode:f.get('eircode'), notes:f.get('notes'),
      priority:f.get('priority')==='on', takenByUserId:f.get('takenByUserId')||currentUserId,
      items:lines.map(l=>({hamper_type_id:l.hamper_type_id,quantity:Number(l.quantity),special_requirements:l.special_requirements})),
    };
    const res=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const json=await res.json(); setSaving(false);
    if(!res.ok){setError(json.error||'Could not create order');return;}
    router.push(`/orders/${json.id}`); router.refresh();
  }

  return <form className="form" onSubmit={submit}>
    <div className="form-section"><h2>Customer</h2><div className="two"><div className="field"><label>Customer / Company *</label><input name="customerName" required placeholder="Customer or company name"/></div><div className="field"><label>Contact Name</label><input name="contactName"/></div></div><div className="two"><div className="field"><label>Phone</label><input name="phone"/></div><div className="field"><label>Email</label><input name="email" type="email"/></div></div><div className="field"><label>Customer PO / Reference</label><input name="customerReference"/></div></div>
    <div className="form-section"><h2>Fulfilment</h2><div className="two"><div className="field"><label>Method *</label><select value={method} onChange={e=>setMethod(e.target.value)}><option value="collection">Collection</option><option value="green_acres">Green Acres Delivery</option><option value="dpd">DPD</option></select></div><div className="field"><label>Delivery / Collection Date *</label><input type="date" value={deliveryDate} onChange={e=>{const v=e.target.value;setDeliveryDate(v);if(v&&!productionDueDate){const d=new Date(v+'T12:00:00');d.setDate(d.getDate()-1);setProductionDueDate(d.toISOString().slice(0,10));}}} required/></div></div><div className="field"><label>Production Due Date</label><input type="date" value={productionDueDate} onChange={e=>setProductionDueDate(e.target.value)}/><small>Leave blank if you want to schedule production later.</small></div>{method!=='collection'&&<><div className="two"><div className="field"><label>Address Line 1</label><input name="address1"/></div><div className="field"><label>Address Line 2</label><input name="address2"/></div></div><div className="three"><div className="field"><label>Town</label><input name="town"/></div><div className="field"><label>County</label><input name="county"/></div><div className="field"><label>Eircode</label><input name="eircode"/></div></div></>}</div>
    <div className="form-section"><div className="section-row"><h2>Hamper Lines</h2><span className="pill">{total} hampers</span></div>{lines.map((line,i)=><div className="line-row" key={i}><div className="field grow"><label>Hamper</label><select value={line.hamper_type_id} onChange={e=>updateLine(i,{hamper_type_id:e.target.value})}>{hampers.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}</select></div><div className="field qty"><label>Qty</label><input type="number" min="1" value={line.quantity} onChange={e=>updateLine(i,{quantity:Number(e.target.value)})}/></div><div className="field grow"><label>Special requirements</label><input value={line.special_requirements} onChange={e=>updateLine(i,{special_requirements:e.target.value})}/></div><button className="icon-button" type="button" onClick={()=>removeLine(i)} aria-label="Remove line">×</button></div>)}<button type="button" className="secondary-button" onClick={addLine}>+ Add another hamper</button></div>
    <div className="form-section"><div className="two"><div className="field"><label>Order Taken By</label><select name="takenByUserId" defaultValue={currentUserId}>{staff.map(s=><option key={s.user_id} value={s.user_id}>{s.display_name}</option>)}</select></div><div className="field checkbox-field"><label><input type="checkbox" name="priority"/> Mark this order as PRIORITY</label></div></div><div className="field"><label>Notes / Delivery Instructions</label><textarea name="notes" rows={4}/></div></div>
    {error&&<div className="error-box">{error}</div>}<div className="form-actions"><button className="button" disabled={saving||hampers.length===0}>{saving?'Creating order…':'Create Order'}</button></div>
  </form>;
}
